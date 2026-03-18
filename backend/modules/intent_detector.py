"""
Intent Detection & Entity Extraction Engine
Detects user intent from complaint text and extracts structured entities.

Supports Hinglish (Hindi-English code-mixed) queries.
"""

import re
import asyncio
from typing import Dict, List, Optional
from concurrent.futures import ThreadPoolExecutor

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.logger import get_logger

logger = get_logger(__name__)


class IntentDetector:
    """
    Detects intent, urgency, and risk level from customer complaints.
    Also performs context-aware entity extraction based on vertical.
    """

    def __init__(self):
        # Intent patterns with Hinglish support
        self.intent_patterns = {
            "Refund_Request": {
                "keywords": [
                    "refund", "money back", "return", "wapas", "paise wapas",
                    "credit back", "reverse", "chargeback", "paisa lautao",
                    "reimburse",
                ],
                "base_risk": "medium",
            },
            "Status_Check": {
                "keywords": [
                    "status", "track", "where", "kahan", "update",
                    "kya hua", "progress", "pending", "check", "pata karo",
                    "batao", "kitna time",
                ],
                "base_risk": "low",
            },
            "Reason_Inquiry": {
                "keywords": [
                    "why", "kyu", "kyun", "reason", "explain", "batao kyu",
                    "samjhao", "how come", "issue kya hai",
                ],
                "base_risk": "low",
            },
            "Block_Report": {
                "keywords": [
                    "block", "blocked", "band", "freeze", "frozen",
                    "suspend", "deactivate", "disable", "lock",
                    "band ho gaya", "block kar do",
                ],
                "base_risk": "high",
            },
            "Fraud_Report": {
                "keywords": [
                    "fraud", "scam", "hack", "unauthorized", "stolen",
                    "chori", "dhokha", "fake", "kisi ne", "without permission",
                    "bina bataye", "galat transaction",
                ],
                "base_risk": "critical",
            },
            "General_Help": {
                "keywords": [
                    "help", "assist", "support", "guide", "how to",
                    "madad", "sahayata", "kaise kare", "kya karu",
                    "information", "tell me",
                ],
                "base_risk": "low",
            },
            "Complaint": {
                "keywords": [
                    "complaint", "problem", "issue", "error", "bug",
                    "not working", "failed", "fail", "dikkat", "pareshani",
                    "theek karo", "fix", "resolve",
                ],
                "base_risk": "medium",
            },
            "Limit_Change": {
                "keywords": [
                    "increase", "decrease", "change", "limit", "badhao",
                    "kam karo", "modify", "update limit",
                ],
                "base_risk": "low",
            },
        }

        # Urgency signals
        self.urgency_high = [
            "urgent", "asap", "immediately", "turant", "abhi",
            "jaldi", "emergency", "critical", "now", "right now",
            "please help", "bahut zaruri", "very important",
        ]
        self.urgency_medium = [
            "soon", "please", "can you", "waiting", "pending",
            "kab tak", "jaldi karo",
        ]

        # Amount thresholds for risk assessment
        self.high_amount_threshold = 10000  # ₹10,000

    def detect(self, text: str, vertical: str = "GENERAL") -> Dict:
        """
        Detect intent, urgency, and risk from text.
        """
        # Handle empty or missing input
        if not text or not text.strip():
            logger.warning("Empty text input for intent detection")
            return {
                "intent": "General_Help",
                "confidence": 0.0,
                "alternatives": [],
                "urgency": "low",
                "risk_level": "low",
            }
        
        # Handle missing vertical (use default)
        if not vertical:
            vertical = "GENERAL"
            logger.debug("No vertical provided, using GENERAL")
        
        try:
            text_lower = text.lower()

            # Score each intent
            intent_scores = {}
            for intent, config in self.intent_patterns.items():
                hits = sum(1 for kw in config["keywords"] if kw in text_lower)
                if hits > 0:
                    intent_scores[intent] = {
                        "score": hits,
                        "base_risk": config["base_risk"],
                    }

            # Determine primary intent
            if intent_scores:
                primary = max(intent_scores, key=lambda i: intent_scores[i]["score"])
                total = sum(s["score"] for s in intent_scores.values())
                confidence = intent_scores[primary]["score"] / total if total > 0 else 0
                base_risk = intent_scores[primary]["base_risk"]
            else:
                primary = "General_Help"
                confidence = 0.3
                base_risk = "low"

            # Alternative intents
            alternatives = []
            for intent, data in sorted(
                intent_scores.items(), key=lambda x: x[1]["score"], reverse=True
            ):
                if intent != primary:
                    alt_conf = data["score"] / total if total > 0 else 0
                    alternatives.append({
                        "intent": intent,
                        "confidence": round(alt_conf, 2),
                    })

            # Detect urgency
            urgency = "low"
            if any(kw in text_lower for kw in self.urgency_high):
                urgency = "high"
            elif any(kw in text_lower for kw in self.urgency_medium):
                urgency = "medium"

            # Adjust risk based on amount + vertical
            risk_level = base_risk
            try:
                amounts = re.findall(r'₹?\s*([\d,]+(?:\.\d{2})?)', text)
                if amounts:
                    try:
                        max_amount = max(
                            float(a.replace(",", "")) for a in amounts
                        )
                        if max_amount >= self.high_amount_threshold:
                            risk_level = "high" if risk_level != "critical" else "critical"
                    except (ValueError, TypeError) as amount_error:
                        logger.warning(
                            f"Failed to parse amount: {str(amount_error)}",
                            extra={"extra_fields": {"amounts": amounts}}
                        )
            except re.error as regex_error:
                logger.error(
                    f"Regex error in amount extraction: {str(regex_error)}",
                    exc_info=True
                )

            if vertical == "FRAUD":
                risk_level = "critical"
            
            logger.debug(
                f"Intent detection completed: {primary}",
                extra={"extra_fields": {
                    "intent": primary,
                    "confidence": round(confidence, 2),
                    "urgency": urgency,
                    "risk_level": risk_level
                }}
            )

            return {
                "intent": primary,
                "confidence": round(min(confidence, 0.99), 2),
                "alternatives": alternatives[:3],
                "urgency": urgency,
                "risk_level": risk_level,
            }
            
        except Exception as e:
            logger.error(
                f"Intent detection failed: {str(e)}",
                exc_info=True,
                extra={"extra_fields": {"text_length": len(text), "vertical": vertical}}
            )
            # Return safe fallback
            return {
                "intent": "General_Help",
                "confidence": 0.0,
                "alternatives": [],
                "urgency": "low",
                "risk_level": "low",
            }

    def extract_entities(self, text: str, vertical: str) -> Dict:
        """
        Context-aware entity extraction based on the detected vertical.
        """
        entities = {}
        
        try:
            # Common entities with error handling
            # Transaction IDs
            try:
                txn_ids = re.findall(r'\b[A-Z0-9]{10,20}\b', text)
                if txn_ids:
                    entities["transaction_id"] = txn_ids[0]
            except re.error as e:
                logger.warning(f"Transaction ID regex failed: {str(e)}")

            # Amounts
            try:
                amounts = re.findall(r'₹\s*([\d,]+(?:\.\d{2})?)', text)
                if not amounts:
                    amounts = re.findall(r'\b(\d{3,}(?:\.\d{2})?)\b', text)
                if amounts:
                    entities["amount"] = amounts[0]
            except re.error as e:
                logger.warning(f"Amount regex failed: {str(e)}")

            # Dates
            try:
                dates = re.findall(
                    r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\b', text
                )
                if dates:
                    entities["date"] = dates[0]
            except re.error as e:
                logger.warning(f"Date regex failed: {str(e)}")

            # Vertical-specific extraction with error handling
            if vertical == "PAYMENTS":
                try:
                    upi_ids = re.findall(r'\b[\w\.]+@[a-z]{2,10}\b', text)
                    if upi_ids:
                        entities["upi_id"] = upi_ids[0]
                except re.error as e:
                    logger.warning(f"UPI ID regex failed: {str(e)}")

                # Payment app detection
                apps = ["gpay", "phonepe", "paytm", "bhim", "googlepay", "google pay"]
                for app in apps:
                    if app in text.lower():
                        entities["payment_app"] = app
                        break

            elif vertical == "CREDIT_CARDS":
                try:
                    # Last 4 digits
                    last4 = re.findall(r'\b\d{4}\b', text)
                    if last4:
                        entities["card_last4"] = last4[-1]
                except re.error as e:
                    logger.warning(f"Card last4 regex failed: {str(e)}")

                try:
                    # Merchant name (after "at" or "on")
                    merchant = re.findall(r'(?:at|on|from)\s+([A-Za-z\s]+?)(?:\s+for|\s+of|\.|$)', text)
                    if merchant:
                        entities["merchant_name"] = merchant[0].strip()
                except re.error as e:
                    logger.warning(f"Merchant name regex failed: {str(e)}")

            elif vertical == "LENDING":
                try:
                    # Loan account
                    loan_acc = re.findall(r'\b(?:loan|LA|LN)\s*#?\s*(\w+)\b', text, re.IGNORECASE)
                    if loan_acc:
                        entities["loan_account"] = loan_acc[0]
                except re.error as e:
                    logger.warning(f"Loan account regex failed: {str(e)}")

                try:
                    # EMI amount
                    emi = re.findall(r'emi\s*(?:of|is|:)?\s*₹?\s*([\d,]+)', text, re.IGNORECASE)
                    if emi:
                        entities["emi_amount"] = emi[0]
                except re.error as e:
                    logger.warning(f"EMI amount regex failed: {str(e)}")

            elif vertical == "ONBOARDING":
                try:
                    # Application number
                    app_no = re.findall(r'(?:application|app|ref)\s*#?\s*(\w+)', text, re.IGNORECASE)
                    if app_no:
                        entities["application_number"] = app_no[0]
                except re.error as e:
                    logger.warning(f"Application number regex failed: {str(e)}")

                # Document type
                docs = ["aadhaar", "pan", "passport", "voter id", "driving license"]
                for doc in docs:
                    if doc in text.lower():
                        entities["document_type"] = doc
                        break

            elif vertical == "FRAUD":
                entities["requires_investigation"] = True
            
            logger.debug(
                f"Entity extraction completed",
                extra={"extra_fields": {
                    "vertical": vertical,
                    "entity_count": len(entities)
                }}
            )

            return entities
            
        except Exception as e:
            logger.error(
                f"Entity extraction failed: {str(e)}",
                exc_info=True,
                extra={"extra_fields": {"vertical": vertical}}
            )
            return {}
    
    async def detect_async(self, text: str, vertical: str = "GENERAL", executor: ThreadPoolExecutor = None) -> Dict:
        """
        Async wrapper for detect() method.
        Runs intent detection in a thread pool executor.
        
        Args:
            text: Input text to analyze
            vertical: Detected vertical
            executor: Optional thread pool executor (uses default if None)
        
        Returns:
            Same as detect() method
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor, self.detect, text, vertical)
    
    async def extract_entities_async(self, text: str, vertical: str, executor: ThreadPoolExecutor = None) -> Dict:
        """
        Async wrapper for extract_entities() method.
        Runs entity extraction in a thread pool executor.
        
        Args:
            text: Input text to extract from
            vertical: Detected vertical
            executor: Optional thread pool executor (uses default if None)
        
        Returns:
            Same as extract_entities() method
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(executor, self.extract_entities, text, vertical)
