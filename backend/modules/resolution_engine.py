"""
Resolution Recommendation Engine
Generates actionable suggestions and draft responses based on analysis results.

Decision Matrix:
| Vertical | Intent          | Risk    | Auto-Resolve? | Agent Action         |
|----------|-----------------|---------|---------------|----------------------|
| Payments | Refund Request  | Low     | ✅ Yes        | Review only          |
| Payments | Refund Request  | High    | ❌ No         | Manual investigation |
| Cards    | Card Block      | Any     | ❌ No         | Explain + Verify     |
| Lending  | EMI Query       | Any     | ⚠️ Partial   | Agent sends          |
| KYC      | Doc Reupload    | Any     | ✅ Yes        | None                 |
| Fraud    | Any             | Any     | ❌ No         | Escalate immediately |
"""

import asyncio
from typing import Dict, List
from concurrent.futures import ThreadPoolExecutor

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.logger import get_logger

logger = get_logger(__name__)


class ResolutionEngine:
    """
    Generates resolution suggestions, draft responses, and action buttons
    based on classified vertical, intent, and risk level.
    """

    def __init__(self):
        # Response templates (Hinglish-friendly)
        self.templates = {
            "PAYMENTS": {
                "Refund_Request": {
                    "low": {
                        "auto_resolve": True,
                        "actions": [
                            {"label": "Initiate Refund", "type": "primary", "auto": True},
                            {"label": "View Transaction", "type": "secondary", "auto": False},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "We have identified your transaction and confirmed it was a "
                            "technical failure. Your refund of {amount} has been initiated "
                            "and will be credited to your account within 2-3 business days.\n\n"
                            "Transaction ID: {transaction_id}\n"
                            "Refund Reference: REF-{ref_id}\n\n"
                            "If you don't receive the refund within 5 business days, "
                            "please contact us again.\n\n"
                            "Regards,\nBank Support Team"
                        ),
                    },
                    "high": {
                        "auto_resolve": False,
                        "actions": [
                            {"label": "Escalate to Fraud Team", "type": "danger", "auto": False},
                            {"label": "Request More Details", "type": "secondary", "auto": False},
                            {"label": "View Transaction History", "type": "secondary", "auto": False},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "We have received your refund request for {amount}. "
                            "Due to the transaction amount and pattern, this requires "
                            "additional verification.\n\n"
                            "Our team is reviewing your case and will update you within "
                            "24-48 hours. Please do not share any OTP or card details "
                            "with anyone claiming to be from our bank.\n\n"
                            "Case ID: CASE-{ref_id}\n\n"
                            "Regards,\nBank Support Team"
                        ),
                    },
                },
                "Status_Check": {
                    "low": {
                        "auto_resolve": True,
                        "actions": [
                            {"label": "Share Status Update", "type": "primary", "auto": True},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "Your transaction status:\n"
                            "Transaction ID: {transaction_id}\n"
                            "Status: Processing\n"
                            "Expected completion: Within 24 hours\n\n"
                            "Regards,\nBank Support Team"
                        ),
                    },
                },
            },
            "CREDIT_CARDS": {
                "Block_Report": {
                    "high": {
                        "auto_resolve": False,
                        "actions": [
                            {"label": "Send Verification Link", "type": "primary", "auto": False},
                            {"label": "Explain Block Reason", "type": "secondary", "auto": False},
                            {"label": "Unblock Card", "type": "danger", "auto": False},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "Your card ending in {card_last4} was blocked due to "
                            "suspicious activity detected on your account.\n\n"
                            "To verify your identity and unblock your card:\n"
                            "1. Click on the verification link sent to your "
                            "registered mobile number\n"
                            "2. Complete the OTP verification\n"
                            "3. Your card will be unblocked within 30 minutes\n\n"
                            "If you did not make these transactions, please visit "
                            "your nearest branch with a valid ID.\n\n"
                            "Regards,\nCard Services Team"
                        ),
                    },
                },
                "Reason_Inquiry": {
                    "low": {
                        "auto_resolve": False,
                        "actions": [
                            {"label": "Send Explanation", "type": "primary", "auto": False},
                            {"label": "Escalate to Manager", "type": "secondary", "auto": False},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "Regarding your inquiry about your card:\n"
                            "We understand your concern. Our records indicate "
                            "the action was taken as a precautionary measure.\n\n"
                            "For detailed information, please call our 24x7 "
                            "helpline or visit your nearest branch.\n\n"
                            "Regards,\nCard Services Team"
                        ),
                    },
                },
            },
            "ONBOARDING": {
                "Status_Check": {
                    "low": {
                        "auto_resolve": True,
                        "actions": [
                            {"label": "Send Re-upload Link", "type": "primary", "auto": True},
                            {"label": "Share Image Guidelines", "type": "secondary", "auto": True},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "Your KYC application is currently pending due to "
                            "document quality issues.\n\n"
                            "Please re-upload the following:\n"
                            "• {document_type} - Ensure clear, well-lit photo\n"
                            "• No blur, no glare, all corners visible\n\n"
                            "Upload link: [Auto-generated]\n"
                            "This link expires in 48 hours.\n\n"
                            "Regards,\nKYC Team"
                        ),
                    },
                },
            },
            "FRAUD": {
                "_default": {
                    "critical": {
                        "auto_resolve": False,
                        "actions": [
                            {"label": "🚨 Escalate to Fraud Team", "type": "danger", "auto": False},
                            {"label": "Block All Cards", "type": "danger", "auto": False},
                            {"label": "Generate FIR Reference", "type": "secondary", "auto": False},
                            {"label": "Initiate Chargeback", "type": "primary", "auto": False},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "We take fraud reports very seriously. Your complaint "
                            "has been escalated to our fraud investigation team "
                            "with HIGHEST priority.\n\n"
                            "Immediate actions taken:\n"
                            "1. Your account has been flagged for monitoring\n"
                            "2. A fraud investigation case (FRAUD-{ref_id}) "
                            "has been opened\n"
                            "3. Our team will contact you within 2 hours\n\n"
                            "IMPORTANT: Do NOT share OTP, card number, or CVV "
                            "with anyone. Our team will NEVER ask for these.\n\n"
                            "If you suspect immediate threat, please also file "
                            "a report at cybercrime.gov.in\n\n"
                            "Regards,\nFraud Prevention Team"
                        ),
                    },
                },
            },
            "LENDING": {
                "General_Help": {
                    "low": {
                        "auto_resolve": False,
                        "actions": [
                            {"label": "Send EMI Details", "type": "primary", "auto": False},
                            {"label": "Share Foreclosure Quote", "type": "secondary", "auto": False},
                        ],
                        "draft": (
                            "Dear Customer,\n\n"
                            "Here are your loan details:\n"
                            "Loan Account: {loan_account}\n"
                            "EMI Amount: ₹{emi_amount}\n\n"
                            "For any changes to your loan, please visit "
                            "the nearest branch or call our helpline.\n\n"
                            "Regards,\nLoans Team"
                        ),
                    },
                },
            },
        }

    def resolve(
        self,
        vertical: str,
        intent: str,
        risk_level: str,
        entities: Dict,
    ) -> Dict:
        """
        Generate resolution recommendation based on analysis.

        Returns:
            dict with actions, draft_response, auto_resolve flag
        """
        import random
        import string

        ref_id = "".join(random.choices(string.digits, k=8))

        # Look up template with logging
        vertical_templates = self.templates.get(vertical, {})
        if not vertical_templates:
            logger.warning(
                f"No templates found for vertical: {vertical}",
                extra={"extra_fields": {"vertical": vertical}}
            )
        
        intent_templates = vertical_templates.get(
            intent, vertical_templates.get("_default", {})
        )
        if not intent_templates:
            logger.info(
                f"No specific template for intent: {intent} in vertical: {vertical}, using fallback",
                extra={"extra_fields": {"vertical": vertical, "intent": intent}}
            )
        
        resolution = intent_templates.get(risk_level, {})

        # Fallback if no specific template found
        if not resolution:
            logger.info(
                f"No template for risk level: {risk_level}, trying fallbacks",
                extra={"extra_fields": {
                    "vertical": vertical,
                    "intent": intent,
                    "risk_level": risk_level
                }}
            )
            # Try with lower risk levels
            for fallback_risk in ["low", "medium", "high", "critical"]:
                resolution = intent_templates.get(fallback_risk, {})
                if resolution:
                    logger.debug(f"Using fallback risk level: {fallback_risk}")
                    break

        # Final fallback
        if not resolution:
            logger.warning(
                f"No template found, using generic fallback",
                extra={"extra_fields": {
                    "vertical": vertical,
                    "intent": intent,
                    "risk_level": risk_level
                }}
            )
            resolution = {
                "auto_resolve": False,
                "actions": [
                    {"label": "Review Manually", "type": "secondary", "auto": False},
                    {"label": "Assign to Agent", "type": "primary", "auto": False},
                ],
                "draft": (
                    "Dear Customer,\n\n"
                    "We have received your query and our team is reviewing it.\n"
                    "You will receive an update within 24-48 hours.\n\n"
                    "Case Reference: CASE-{ref_id}\n\n"
                    "Regards,\nCustomer Support Team"
                ),
            }

        # Fill template with extracted entities
        try:
            draft = resolution.get("draft", "")
            template_vars = {
                "ref_id": ref_id,
                "amount": entities.get("amount", "[Amount]"),
                "transaction_id": entities.get("transaction_id", "[Transaction ID]"),
                "card_last4": entities.get("card_last4", "[****]"),
                "document_type": entities.get("document_type", "[Document]"),
                "loan_account": entities.get("loan_account", "[Loan Account]"),
                "emi_amount": entities.get("emi_amount", "[EMI Amount]"),
            }

            for key, value in template_vars.items():
                draft = draft.replace("{" + key + "}", str(value))
            
            logger.debug(
                f"Resolution generated",
                extra={"extra_fields": {
                    "vertical": vertical,
                    "intent": intent,
                    "risk_level": risk_level,
                    "auto_resolve": resolution.get("auto_resolve", False),
                    "reference_id": ref_id
                }}
            )
        except Exception as template_error:
            logger.error(
                f"Template substitution failed: {str(template_error)}",
                exc_info=True,
                extra={"extra_fields": {"reference_id": ref_id}}
            )
            # Use template without substitution as fallback
            pass

        return {
            "auto_resolve": resolution.get("auto_resolve", False),
            "actions": resolution.get("actions", []),
            "draft_response": draft,
            "reference_id": ref_id,
        }
    
    async def resolve_async(
        self,
        vertical: str,
        intent: str,
        risk_level: str,
        entities: Dict,
        executor: ThreadPoolExecutor = None
    ) -> Dict:
        """
        Async wrapper for resolve() method.
        Runs resolution generation in a thread pool executor.
        
        Args:
            vertical: Detected vertical
            intent: Detected intent
            risk_level: Detected risk level
            entities: Extracted entities
            executor: Optional thread pool executor (uses default if None)
        
        Returns:
            Same as resolve() method
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            executor,
            self.resolve,
            vertical,
            intent,
            risk_level,
            entities
        )
