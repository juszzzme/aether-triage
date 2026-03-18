"""
Vertical Classification Engine
Routes tickets to the correct banking department.

Classification Taxonomy:
├── PAYMENTS (UPI, NEFT, IMPS, Refund)
├── LENDING (EMI, Foreclosure, Interest, Rescheduling)
├── CREDIT_CARDS (Block, Limit, Charges, Rewards, Disputes)
├── ONBOARDING (KYC, Activation, Document, Video KYC)
└── FRAUD (Unauthorized, OTP, Phishing, Cloning)
"""

import re
import asyncio
from typing import Dict, List, Tuple
from concurrent.futures import ThreadPoolExecutor

import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from utils.logger import get_logger

logger = get_logger(__name__)


class VerticalClassifier:
    """
    Multi-vertical banking ticket classifier.
    v1.0: Enhanced keyword-based with confidence scoring.
    v2.0 target: Fine-tuned BERT (ai4bharat/indic-bert).
    """

    def __init__(self):
        # Keyword taxonomy with weighted signals
        self.taxonomy = {
            "PAYMENTS": {
                "keywords": [
                    "upi", "payment", "transaction", "neft", "imps", "rtgs",
                    "transfer", "paise", "paisa", "money", "amount", "refund",
                    "credited", "debited", "failed", "timeout", "pending",
                    "gpay", "phonepe", "paytm", "bhim", "googlepay",
                    "kat gaye", "kat gaya", "nahi mila", "nahi aaya",
                    "paise wapas", "merchant", "txn", "transaction id",
                ],
                "weight": 1.0,
                "subcategories": {
                    "UPI_Failure": ["upi", "failed", "timeout", "pending"],
                    "NEFT_Delay": ["neft", "delay", "pending", "slow"],
                    "IMPS_Timeout": ["imps", "timeout", "stuck"],
                    "Refund_Request": ["refund", "wapas", "return", "money back"],
                },
            },
            "CREDIT_CARDS": {
                "keywords": [
                    "card", "credit card", "debit card", "swipe", "blocked",
                    "limit", "credit limit", "unrecognized", "charge",
                    "statement", "reward", "points", "declined", "cvv",
                    "emi convert", "bill", "minimum due", "outstanding",
                    "card block", "card blocked", "band ho gaya",
                ],
                "weight": 1.0,
                "subcategories": {
                    "Card_Blocked": ["block", "blocked", "band", "decline"],
                    "Limit_Increase": ["limit", "increase", "badhao"],
                    "Unrecognized_Charge": ["unrecognized", "unknown", "fraud", "nahi kiya"],
                    "Rewards_Query": ["reward", "points", "cashback"],
                    "Statement_Dispute": ["statement", "bill", "charge", "dispute"],
                },
            },
            "LENDING": {
                "keywords": [
                    "loan", "emi", "interest", "foreclosure", "prepayment",
                    "principal", "tenure", "installment", "rate", "mortgage",
                    "personal loan", "home loan", "car loan", "education loan",
                    "emi date", "emi change", "emi bounce", "overdue",
                ],
                "weight": 1.0,
                "subcategories": {
                    "EMI_Query": ["emi", "installment", "monthly"],
                    "Loan_Foreclosure": ["foreclosure", "close", "prepay", "band karna"],
                    "Interest_Rate": ["interest", "rate", "byaj"],
                    "Payment_Rescheduling": ["reschedule", "date change", "postpone"],
                },
            },
            "ONBOARDING": {
                "keywords": [
                    "kyc", "document", "aadhaar", "pan", "passport",
                    "verification", "account open", "activate", "activation",
                    "upload", "submit", "pending", "video kyc", "e-kyc",
                    "latak", "stuck", "pending hai", "active nahi",
                ],
                "weight": 0.9,
                "subcategories": {
                    "KYC_Pending": ["kyc", "pending", "latak", "stuck"],
                    "Account_Activation": ["activate", "activation", "active nahi"],
                    "Document_Reupload": ["upload", "document", "reupload", "blurry"],
                    "Video_KYC": ["video kyc", "video call", "face verification"],
                },
            },
            "FRAUD": {
                "keywords": [
                    "fraud", "scam", "unauthorized", "hacked", "stolen",
                    "otp", "phishing", "cloning", "suspicious", "chori",
                    "someone else", "kisi ne", "bina permission", "without consent",
                    "unknown transaction", "nahi kiya maine",
                ],
                "weight": 1.2,  # Higher weight for fraud signals
                "subcategories": {
                    "Unauthorized_Transaction": ["unauthorized", "without", "bina", "nahi kiya"],
                    "OTP_Compromise": ["otp", "code", "password"],
                    "Phishing_Report": ["phishing", "link", "fake", "scam"],
                    "Card_Cloning": ["cloning", "duplicate", "copy"],
                },
            },
        }

    def classify(self, text: str) -> Dict:
        """
        Classify text into a banking vertical with confidence score.
        
        Returns:
            dict with vertical, confidence, subcategory, and all scores
        """
        # Handle empty or whitespace-only input
        if not text or not text.strip():
            logger.warning("Empty text input for classification, returning GENERAL")
            return {
                "vertical": "GENERAL",
                "confidence": 0.0,
                "subcategory": None,
                "all_scores": {},
            }
        
        try:
            text_lower = text.lower()
            scores = {}

            for vertical, config in self.taxonomy.items():
                try:
                    keyword_hits = sum(
                        1 for kw in config["keywords"] if kw in text_lower
                    )
                    score = keyword_hits * config["weight"]

                    # Subcategory detection
                    best_sub = None
                    best_sub_score = 0
                    for sub, sub_keywords in config["subcategories"].items():
                        sub_hits = sum(1 for kw in sub_keywords if kw in text_lower)
                        if sub_hits > best_sub_score:
                            best_sub_score = sub_hits
                            best_sub = sub

                    scores[vertical] = {
                        "score": score,
                        "hits": keyword_hits,
                        "subcategory": best_sub,
                    }
                except Exception as vertical_error:
                    logger.error(
                        f"Error processing vertical {vertical}: {str(vertical_error)}",
                        exc_info=True,
                        extra={"extra_fields": {"vertical": vertical}}
                    )
                    continue

            if not scores:
                logger.info("No vertical scores, returning GENERAL fallback")
                return {
                    "vertical": "GENERAL",
                    "confidence": 0.0,
                    "subcategory": None,
                    "all_scores": {},
                }

            # Normalize scores to confidence with zero-division protection
            total = sum(s["score"] for s in scores.values())
            if total == 0:
                logger.info("All vertical scores are zero, returning GENERAL")
                return {
                    "vertical": "GENERAL",
                    "confidence": 0.0,
                    "subcategory": None,
                    "all_scores": {},
                }
            
            best_vertical = max(scores, key=lambda v: scores[v]["score"])
            confidence = scores[best_vertical]["score"] / total
            
            logger.debug(
                f"Classification completed: {best_vertical}",
                extra={"extra_fields": {
                    "vertical": best_vertical,
                    "confidence": round(confidence, 2),
                    "subcategory": scores[best_vertical]["subcategory"]
                }}
            )

            return {
                "vertical": best_vertical,
                "confidence": round(min(confidence, 0.99), 2),
                "subcategory": scores[best_vertical]["subcategory"],
                "all_scores": {
                    v: round(s["score"] / total, 2)
                    for v, s in scores.items()
                },
            }
            
        except Exception as e:
            logger.error(
                f"Classification failed with error: {str(e)}",
                exc_info=True,
                extra={"extra_fields": {"text_length": len(text)}}
            )
            # Return safe fallback
            return {
                "vertical": "GENERAL",
                "confidence": 0.0,
                "subcategory": None,
                "all_scores": {},
            }

    async def classify_async(self, text: str, executor: ThreadPoolExecutor = None) -> Dict:
        """
        Async wrapper for classify() method.
        
        Runs the synchronous classify() method in a thread pool executor
        to avoid blocking the event loop. This enables non-blocking concurrent
        execution when processing multiple tickets.
        
        Args:
            text: Input text to classify (supports English and Hinglish)
            executor: ThreadPoolExecutor instance (optional). If None, uses
                     asyncio's default executor.
        
        Returns:
            Dict containing:
                - vertical (str): Classified vertical (PAYMENTS, LENDING, etc.)
                - confidence (float): Classification confidence (0.0-0.99)
                - subcategory (str): More specific subcategory if detected
                - all_scores (dict): Scores for all verticals
        
        Example:
            >>> classifier = VerticalClassifier()
            >>> result = await classifier.classify_async("UPI payment failed", executor)
            >>> print(result["vertical"])  # "PAYMENTS"
        """
        loop = asyncio.get_event_loop()
        
        try:
            if executor is None:
                # Use default executor if none provided
                return await loop.run_in_executor(None, self.classify, text)
            else:
                return await loop.run_in_executor(executor, self.classify, text)
        except Exception as e:
            logger.error(
                f"Async classification failed: {str(e)}",
                exc_info=True,
                extra={"extra_fields": {"text_length": len(text) if text else 0}}
            )
            # Return safe fallback
            return {
                "vertical": "GENERAL",
                "confidence": 0.0,
                "subcategory": None,
                "all_scores": {},
            }
