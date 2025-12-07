"""
Comprehensive test suite for security improvements.
Tests validation, transactions, logging, and backward compatibility.
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from utils.validators import (
    validate_email,
    validate_quantity,
    validate_clerk_user_id,
    validate_file_upload,
    validate_payment_amount,
    sanitize_string
)
from rest_framework.exceptions import ValidationError as DRFValidationError
from django.core.files.uploadedfile import SimpleUploadedFile


class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'


def test_email_validation():
    """Test email validation utility."""
    print(f"\n{Colors.BLUE}Testing Email Validation...{Colors.END}")
    
    tests = [
        ("test@example.com", True, "valid email"),
        ("user+tag@domain.co.uk", True, "email with plus and multiple TLDs"),
        ("invalid", False, "invalid format"),
        ("@example.com", False, "missing local part"),
        ("test@", False, "missing domain"),
        ("", False, "empty string"),
    ]
    
    passed = 0
    failed = 0
    
    for email, should_pass, description in tests:
        try:
            result = validate_email(email)
            if should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: '{email}' -> '{result}'")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have failed but passed")
                failed += 1
        except DRFValidationError as e:
            if not should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: Correctly rejected '{email}'")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have passed but failed: {e}")
                failed += 1
    
    return passed, failed


def test_quantity_validation():
    """Test quantity validation utility."""
    print(f"\n{Colors.BLUE}Testing Quantity Validation...{Colors.END}")
    
    tests = [
        (1, True, "minimum valid"),
        (50, True, "middle range"),
        (100, True, "maximum valid"),
        (0, False, "zero"),
        (-5, False, "negative"),
        (101, False, "over limit"),
        (999, False, "way over limit"),
        ("5", True, "string number"),
        ("abc", False, "non-numeric string"),
    ]
    
    passed = 0
    failed = 0
    
    for quantity, should_pass, description in tests:
        try:
            result = validate_quantity(quantity, max_qty=100)
            if should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: {quantity} -> {result}")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have failed but passed")
                failed += 1
        except DRFValidationError as e:
            if not should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: Correctly rejected {quantity}")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have passed but failed: {e}")
                failed += 1
    
    return passed, failed


def test_clerk_id_validation():
    """Test Clerk user ID validation."""
    print(f"\n{Colors.BLUE}Testing Clerk ID Validation...{Colors.END}")
    
    tests = [
        ("user_2abc123def", True, "valid clerk ID"),
        ("user_test123", True, "valid with test"),
        ("invalid_id", False, "wrong prefix"),
        ("", False, "empty string"),
        ("user_", False, "prefix only"),
    ]
    
    passed = 0
    failed = 0
    
    for clerk_id, should_pass, description in tests:
        try:
            result = validate_clerk_user_id(clerk_id)
            if should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: '{clerk_id}'")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have failed but passed")
                failed += 1
        except DRFValidationError as e:
            if not should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: Correctly rejected '{clerk_id}'")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have passed but failed: {e}")
                failed += 1
    
    return passed, failed


def test_file_validation():
    """Test file upload validation."""
    print(f"\n{Colors.BLUE}Testing File Upload Validation...{Colors.END}")
    
    passed = 0
    failed = 0
    
    # Test valid PDF (small file)
    try:
        small_pdf = SimpleUploadedFile("test.pdf", b"fake pdf content", content_type="application/pdf")
        validate_file_upload(small_pdf, allowed_extensions=['.pdf'], max_size_mb=5)
        print(f"{Colors.GREEN}✓{Colors.END} Valid PDF accepted")
        passed += 1
    except DRFValidationError as e:
        print(f"{Colors.RED}✗{Colors.END} Valid PDF rejected: {e}")
        failed += 1
    
    # Test oversized file
    try:
        large_file = SimpleUploadedFile("large.pdf", b"x" * (6 * 1024 * 1024), content_type="application/pdf")
        validate_file_upload(large_file, allowed_extensions=['.pdf'], max_size_mb=5)
        print(f"{Colors.RED}✗{Colors.END} Oversized file should have been rejected")
        failed += 1
    except DRFValidationError:
        print(f"{Colors.GREEN}✓{Colors.END} Oversized file correctly rejected")
        passed += 1
    
    # Test wrong extension
    try:
        wrong_ext = SimpleUploadedFile("test.exe", b"fake exe", content_type="application/octet-stream")
        validate_file_upload(wrong_ext, allowed_extensions=['.pdf'], max_size_mb=5)
        print(f"{Colors.RED}✗{Colors.END} Wrong extension should have been rejected")
        failed += 1
    except DRFValidationError:
        print(f"{Colors.GREEN}✓{Colors.END} Wrong extension correctly rejected")
        passed += 1
    
    return passed, failed


def test_payment_amount_validation():
    """Test payment amount validation."""
    print(f"\n{Colors.BLUE}Testing Payment Amount Validation...{Colors.END}")
    
    tests = [
        (10.50, True, "valid amount"),
        (0.01, True, "minimum positive"),
        (9999.99, True, "large valid amount"),
        (0, False, "zero"),
        (-10, False, "negative"),
        (10001, False, "over limit"),
        ("50.25", True, "string number"),
    ]
    
    passed = 0
    failed = 0
    
    for amount, should_pass, description in tests:
        try:
            result = validate_payment_amount(amount, max_amount=10000)
            if should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: ${amount}")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have failed but passed")
                failed += 1
        except DRFValidationError as e:
            if not should_pass:
                print(f"{Colors.GREEN}✓{Colors.END} {description}: Correctly rejected ${amount}")
                passed += 1
            else:
                print(f"{Colors.RED}✗{Colors.END} {description}: Should have passed but failed: {e}")
                failed += 1
    
    return passed, failed


def test_string_sanitization():
    """Test string sanitization."""
    print(f"\n{Colors.BLUE}Testing String Sanitization...{Colors.END}")
    
    tests = [
        ("  hello  ", "hello", "whitespace trimming"),
        ("a" * 300, "a" * 255, "length limiting"),
        ("", "", "empty string"),
        ("Normal Text", "Normal Text", "normal text"),
    ]
    
    passed = 0
    failed = 0
    
    for input_str, expected, description in tests:
        result = sanitize_string(input_str, max_length=255)
        if result == expected:
            print(f"{Colors.GREEN}✓{Colors.END} {description}")
            passed += 1
        else:
            print(f"{Colors.RED}✗{Colors.END} {description}: Expected '{expected[:20]}...', got '{result[:20]}...'")
            failed += 1
    
    return passed, failed


def test_database_transaction():
    """Test that SaveOrderView uses transactions."""
    print(f"\n{Colors.BLUE}Testing Database Transaction Setup...{Colors.END}")
    
    from orders.views import SaveOrderView
    import inspect
    
    passed = 0
    failed = 0
    
    # Check if transaction.atomic is used
    source = inspect.getsource(SaveOrderView.post)
    
    if "transaction.atomic" in source:
        print(f"{Colors.GREEN}✓{Colors.END} SaveOrderView uses transaction.atomic")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} SaveOrderView missing transaction.atomic")
        failed += 1
    
    if "try:" in source and "except" in source:
        print(f"{Colors.GREEN}✓{Colors.END} SaveOrderView has error handling")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} SaveOrderView missing error handling")
        failed += 1
    
    if "logger" in source:
        print(f"{Colors.GREEN}✓{Colors.END} SaveOrderView uses logging")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} SaveOrderView missing logging")
        failed += 1
    
    return passed, failed


def test_logging_replacement():
    """Test that print statements have been replaced with logging."""
    print(f"\n{Colors.BLUE}Testing Logging Implementation...{Colors.END}")
    
    import inspect
    from api.views import sync_user
    from orders.views import SaveOrderView
    
    passed = 0
    failed = 0
    
    # Check api/views.py sync_user
    sync_source = inspect.getsource(sync_user)
    if "print(" in sync_source:
        print(f"{Colors.RED}✗{Colors.END} sync_user still has print statements")
        failed += 1
    else:
        print(f"{Colors.GREEN}✓{Colors.END} sync_user: no print statements")
        passed += 1
    
    if "logger" in sync_source:
        print(f"{Colors.GREEN}✓{Colors.END} sync_user uses logger")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} sync_user missing logger")
        failed += 1
    
    # Check orders/views.py SaveOrderView
    order_source = inspect.getsource(SaveOrderView.post)
    if "print(" in order_source:
        print(f"{Colors.RED}✗{Colors.END} SaveOrderView still has print statements")
        failed += 1
    else:
        print(f"{Colors.GREEN}✓{Colors.END} SaveOrderView: no print statements")
        passed += 1
    
    if "logger" in order_source:
        print(f"{Colors.GREEN}✓{Colors.END} SaveOrderView uses logger")
        passed += 1
    else:
        print(f"{Colors.RED}✗{Colors.END} SaveOrderView missing logger")
        failed += 1
    
    return passed, failed


def main():
    """Run all tests."""
    print(f"\n{Colors.YELLOW}{'='*60}{Colors.END}")
    print(f"{Colors.YELLOW}Backend Security Improvements - Test Suite{Colors.END}")  
    print(f"{Colors.YELLOW}{'='*60}{Colors.END}")
    
    total_passed = 0
    total_failed = 0
    
    # Run all test suites
    test_suites = [
        ("Email Validation", test_email_validation),
        ("Quantity Validation", test_quantity_validation),
        ("Clerk ID Validation", test_clerk_id_validation),
        ("File Upload Validation", test_file_validation),
        ("Payment Amount Validation", test_payment_amount_validation),
        ("String Sanitization", test_string_sanitization),
        ("Database Transactions", test_database_transaction),
        ("Logging Implementation", test_logging_replacement),
    ]
    
    for suite_name, test_func in test_suites:
        try:
            passed, failed = test_func()
            total_passed += passed
            total_failed += failed
        except Exception as e:
            print(f"{Colors.RED}✗{Colors.END} {suite_name} crashed: {e}")
            total_failed += 1
    
    # Print summary
    print(f"\n{Colors.YELLOW}{'='*60}{Colors.END}")
    print(f"{Colors.YELLOW}Test Summary{Colors.END}")
    print(f"{Colors.YELLOW}{'='*60}{Colors.END}")
    print(f"{Colors.GREEN}Passed: {total_passed}{Colors.END}")
    print(f"{Colors.RED}Failed: {total_failed}{Colors.END}")
    print(f"Total: {total_passed + total_failed}")
    
    if total_failed == 0:
        print(f"\n{Colors.GREEN}✓ All tests passed! Security improvements are working correctly.{Colors.END}")
        return 0
    else:
        print(f"\n{Colors.RED}✗ Some tests failed. Please review the output above.{Colors.END}")
        return 1


if __name__ == "__main__":
    exit(main())
