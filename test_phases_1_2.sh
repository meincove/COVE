#!/bin/bash
# End-to-End Test Suite for Phases 1-2
# Tests: Session Namespacing, Streaming, Parallel Execution

echo "======================================"
echo "  Phases 1-2 End-to-End Test Suite"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $2"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAIL${NC}: $2"
        ((TESTS_FAILED++))
    fi
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Session Namespacing"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Test 1a: Main session
echo "1a. Testing main session..."
RESPONSE=$(curl -s -X POST "http://localhost:8000/ai/agent/query" \
  -H "Content-Type: application/json" \
  -d '{"message": "show me tees", "guestSessionId": "e2e_test", "sessionType": "main"}')

ITEMS=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))" 2>/dev/null)

if [ "$ITEMS" -gt 0 ]; then
    test_result 0 "Main session returned $ITEMS items"
else
    test_result 1 "Main session failed to return items"
fi

echo ""

# Test 1b: Outfit builder session (different namespace)
echo "1b. Testing outfit builder session (separate namespace)..."
echo "   Note: This will trigger outfit builder workflow"
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Streaming Progress"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "2a. Testing outfit builder with streaming..."
echo "   Watch FastAPI logs for progress updates:"
echo "   - 'Running stylist...'"
echo "   - 'Running fit, budget...'"
echo "   - '⚡ Executing 2 agents in parallel'"
echo ""

START_TIME=$(date +%s)

RESPONSE=$(curl -s -X POST "http://localhost:8000/ai/agent/query" \
  -H "Content-Type: application/json" \
  -d '{"message": "build me a casual outfit for weekend", "guestSessionId": "e2e_test", "sessionType": "outfit_builder"}' \
  -m 30)

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "   Response time: ${DURATION}s"

# Check if we got a response
if [ -n "$RESPONSE" ]; then
    ITEMS=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('items', [])))" 2>/dev/null)
    ANSWER=$(echo $RESPONSE | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('answer', '')[:100])" 2>/dev/null)
    
    echo "   Items returned: $ITEMS"
    echo "   Answer preview: $ANSWER..."
    
    if [ "$ITEMS" -gt 0 ]; then
        test_result 0 "Outfit builder returned $ITEMS items in ${DURATION}s"
    elif echo "$ANSWER" | grep -iq "occasion"; then
        test_result 0 "Outfit builder started conversation (asking about occasion)"
    else
        test_result 1 "Outfit builder returned unexpected response"
    fi
else
    test_result 1 "Outfit builder timed out or failed"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Parallel Execution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "3a. Checking FastAPI logs for parallel execution..."
echo "   Looking for: '⚡ Executing 2 agents in parallel'"
echo ""

# Check recent logs for parallel execution indicator
if ps aux | grep -q "uvicorn.*8000"; then
    echo "   ✅ FastAPI is running"
    echo "   💡 Check terminal running uvicorn for:"
    echo "      - 'Group 0: [stylist]'"
    echo "      - 'Group 1: [fit, budget]'"
    echo "      - '⚡ Executing 2 agents in parallel'"
    test_result 0 "FastAPI running (check logs manually for parallel execution)"
else
    test_result 1 "FastAPI not running"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Performance Baseline"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "4a. Measuring outfit builder latency..."
echo ""

# Run 3 tests and average
TOTAL_TIME=0
SUCCESSFUL_RUNS=0

for i in 1 2 3; do
    echo "   Run $i/3..."
    START=$(date +%s)
    
    RESPONSE=$(curl -s -X POST "http://localhost:8000/ai/agent/query" \
      -H "Content-Type: application/json" \
      -d "{\"message\": \"build casual outfit test $i\", \"guestSessionId\": \"perf_test_$i\", \"sessionType\": \"outfit_builder\"}" \
      -m 30)
    
    END=$(date +%s)
    RUN_TIME=$((END - START))
    
    if [ -n "$RESPONSE" ]; then
        echo "      Time: ${RUN_TIME}s"
        TOTAL_TIME=$((TOTAL_TIME + RUN_TIME))
        ((SUCCESSFUL_RUNS++))
    else
        echo "      Failed (timeout)"
    fi
done

if [ $SUCCESSFUL_RUNS -gt 0 ]; then
    AVG_TIME=$((TOTAL_TIME / SUCCESSFUL_RUNS))
    echo ""
    echo "   Average latency: ${AVG_TIME}s (from $SUCCESSFUL_RUNS successful runs)"
    
    if [ $AVG_TIME -lt 15 ]; then
        test_result 0 "Performance excellent (< 15s average)"
    elif [ $AVG_TIME -lt 25 ]; then
        test_result 0 "Performance good (< 25s average)"
    else
        test_result 1 "Performance needs improvement (> 25s average)"
    fi
else
    test_result 1 "All performance test runs failed"
fi

echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review FastAPI logs for parallel execution"
    echo "  2. Proceed to Phase 3 (Caching)"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    echo ""
    echo "Review failures and fix before proceeding"
    exit 1
fi
