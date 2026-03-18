"""
Test script for logging and error handling implementation.
Run this to verify the logging infrastructure works correctly.
"""

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.logger import setup_logging, get_logger, set_correlation_id, clear_correlation_id


def test_logging_setup():
    """Test basic logging configuration."""
    print("=" * 60)
    print("Testing Logging Setup")
    print("=" * 60)
    
    # Initialize logging
    logger = setup_logging(environment="development", log_level="DEBUG")
    print("✓ Logging initialized successfully")
    
    # Get module logger
    test_logger = get_logger("test_module")
    print("✓ Module logger created")
    
    return logger, test_logger


def test_log_levels(logger):
    """Test all log levels."""
    print("\n" + "=" * 60)
    print("Testing Log Levels")
    print("=" * 60)
    
    logger.debug("This is a DEBUG message")
    logger.info("This is an INFO message")
    logger.warning("This is a WARNING message")
    logger.error("This is an ERROR message")
    logger.critical("This is a CRITICAL message")
    
    print("✓ All log levels tested")


def test_structured_logging(logger):
    """Test structured logging with extra fields."""
    print("\n" + "=" * 60)
    print("Testing Structured Logging")
    print("=" * 60)
    
    logger.info(
        "Processing ticket",
        extra={"extra_fields": {
            "ticket_id": "12345",
            "status": "processing",
            "priority": "high",
            "user_id": "user@example.com"
        }}
    )
    
    print("✓ Structured logging tested")


def test_correlation_id(logger):
    """Test correlation ID functionality."""
    print("\n" + "=" * 60)
    print("Testing Correlation IDs")
    print("=" * 60)
    
    # Set correlation ID
    correlation_id = "test-correlation-123"
    set_correlation_id(correlation_id)
    
    logger.info("Message with correlation ID")
    logger.warning("Another message with same correlation ID")
    
    # Clear correlation ID
    clear_correlation_id()
    
    logger.info("Message without correlation ID")
    
    print(f"✓ Correlation ID tested: {correlation_id}")


def test_exception_logging(logger):
    """Test exception logging with stack traces."""
    print("\n" + "=" * 60)
    print("Testing Exception Logging")
    print("=" * 60)
    
    try:
        # Simulate an error
        result = 1 / 0
    except ZeroDivisionError as e:
        logger.error(
            f"Caught exception: {str(e)}",
            exc_info=True,
            extra={"extra_fields": {
                "operation": "division",
                "dividend": 1,
                "divisor": 0
            }}
        )
    
    print("✓ Exception logging tested")


def test_module_imports():
    """Test importing all modules with logging."""
    print("\n" + "=" * 60)
    print("Testing Module Imports")
    print("=" * 60)
    
    try:
        from modules.pii_masker import PIIMasker
        print("✓ PIIMasker imported successfully")
        
        from modules.vertical_classifier import VerticalClassifier
        print("✓ VerticalClassifier imported successfully")
        
        from modules.intent_detector import IntentDetector
        print("✓ IntentDetector imported successfully")
        
        from modules.resolution_engine import ResolutionEngine
        print("✓ ResolutionEngine imported successfully")
        
        from middleware.request_logger import RequestLoggingMiddleware
        print("✓ RequestLoggingMiddleware imported successfully")
        
        return True
    except Exception as e:
        print(f"✗ Import failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_module_functionality():
    """Test basic functionality of modules with error handling."""
    print("\n" + "=" * 60)
    print("Testing Module Functionality")
    print("=" * 60)
    
    try:
        from modules.pii_masker import PIIMasker
        from modules.vertical_classifier import VerticalClassifier
        from modules.intent_detector import IntentDetector
        from modules.resolution_engine import ResolutionEngine
        
        # Test PII Masker
        pii_masker = PIIMasker()
        result = pii_masker.mask("My phone is 9876543210 and email is test@example.com")
        print(f"✓ PII Masker: {result['redaction_count']} entities masked")
        
        # Test with empty input (error handling)
        result = pii_masker.mask("")
        print(f"✓ PII Masker empty input handling: language={result.get('language', 'N/A')}")
        
        # Test Vertical Classifier
        classifier = VerticalClassifier()
        result = classifier.classify("My UPI payment failed, need refund")
        print(f"✓ Vertical Classifier: {result['vertical']} ({result['confidence']})")
        
        # Test with empty input
        result = classifier.classify("")
        print(f"✓ Vertical Classifier empty input: {result['vertical']}")
        
        # Test Intent Detector
        detector = IntentDetector()
        result = detector.detect("I need refund urgently", vertical="PAYMENTS")
        print(f"✓ Intent Detector: {result['intent']} (risk: {result['risk_level']})")
        
        # Test with empty input
        result = detector.detect("", vertical="GENERAL")
        print(f"✓ Intent Detector empty input: {result['intent']}")
        
        # Test Resolution Engine
        resolver = ResolutionEngine()
        result = resolver.resolve(
            vertical="PAYMENTS",
            intent="Refund_Request",
            risk_level="low",
            entities={"amount": "500"}
        )
        print(f"✓ Resolution Engine: auto_resolve={result['auto_resolve']}")
        
        return True
    except Exception as e:
        print(f"✗ Module test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "█" * 60)
    print("Aether Backend - Logging & Error Handling Test Suite")
    print("█" * 60)
    
    # Test 1: Logging setup
    logger, test_logger = test_logging_setup()
    
    # Test 2: Log levels
    test_log_levels(logger)
    
    # Test 3: Structured logging
    test_structured_logging(logger)
    
    # Test 4: Correlation IDs
    test_correlation_id(logger)
    
    # Test 5: Exception logging
    test_exception_logging(logger)
    
    # Test 6: Module imports
    imports_ok = test_module_imports()
    
    # Test 7: Module functionality
    if imports_ok:
        modules_ok = test_module_functionality()
    else:
        modules_ok = False
        print("\n✗ Skipping module functionality tests due to import errors")
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Logging Infrastructure: ✓ PASS")
    print(f"Module Imports: {'✓ PASS' if imports_ok else '✗ FAIL'}")
    print(f"Module Functionality: {'✓ PASS' if modules_ok else '✗ FAIL'}")
    print("=" * 60)
    
    print("\n📝 Check the following files for log output:")
    print("   - backend/logs/aether.log")
    print("   - backend/logs/error.log")
    print("\n✨ Test completed!")
    
    return imports_ok and modules_ok


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
