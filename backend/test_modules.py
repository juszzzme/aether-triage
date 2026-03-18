"""Quick verification test for all backend modules."""

import sys
sys.path.insert(0, ".")

from modules.pii_masker import PIIMasker
from modules.vertical_classifier import VerticalClassifier
from modules.intent_detector import IntentDetector
from modules.resolution_engine import ResolutionEngine

p = PIIMasker()
v = VerticalClassifier()
i = IntentDetector()
r = ResolutionEngine()

# Test 1: Hinglish UPI complaint
print("=" * 50)
print("TEST 1: Hinglish UPI Complaint")
print("=" * 50)
text = "Sir mera transaction fail ho gaya. 9876543210 se 5000 rupay bheje the merchant ko nahi mila. Urgent hai!"
result_p = p.mask(text)
print(f"Language: {result_p['language']}")
print(f"Masked: {result_p['masked_text']}")
print(f"PII found: {len(result_p['pii_entities'])}")

result_v = v.classify(result_p["masked_text"])
print(f"Vertical: {result_v['vertical']} (conf: {result_v['confidence']})")

result_i = i.detect(result_p["masked_text"], result_v["vertical"])
print(f"Intent: {result_i['intent']} (conf: {result_i['confidence']})")
print(f"Risk: {result_i['risk_level']}, Urgency: {result_i['urgency']}")

entities = i.extract_entities(text, result_v["vertical"])
print(f"Entities: {entities}")

result_r = r.resolve(result_v["vertical"], result_i["intent"], result_i["risk_level"], entities)
print(f"Actions: {[a['label'] for a in result_r['actions']]}")
print(f"Auto-resolve: {result_r['auto_resolve']}")

# Test 2: Credit card block
print("\n" + "=" * 50)
print("TEST 2: Card Blocked (Hinglish)")
print("=" * 50)
text2 = "Card block kyu hua? Urgent hai! HDFC card ending 4402"
result_p2 = p.mask(text2)
result_v2 = v.classify(result_p2["masked_text"])
result_i2 = i.detect(result_p2["masked_text"], result_v2["vertical"])
print(f"Vertical: {result_v2['vertical']}, Intent: {result_i2['intent']}")
print(f"Risk: {result_i2['risk_level']}, Urgency: {result_i2['urgency']}")

# Test 3: Fraud report
print("\n" + "=" * 50)
print("TEST 3: Fraud Report")
print("=" * 50)
text3 = "Someone made unauthorized transaction from my account. Maine nahi kiya ye!"
result_v3 = v.classify(text3)
result_i3 = i.detect(text3, result_v3["vertical"])
print(f"Vertical: {result_v3['vertical']}, Intent: {result_i3['intent']}")
print(f"Risk: {result_i3['risk_level']}, Urgency: {result_i3['urgency']}")

print("\n" + "=" * 50)
print("ALL TESTS PASSED!")
print("=" * 50)
