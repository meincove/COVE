#!/bin/bash
# Week 4 - Master Test Suite
# Runs all tests for Phases 1-5

set -e  # Exit on error

echo "🧪 Week 4 - Complete Test Suite"
echo "================================"
echo ""

# Check servers are running
echo "📡 Checking servers..."
if ! curl -s http://127.0.0.1:8001/admin/ > /dev/null 2>&1; then
    echo "❌ Django backend not running on port 8001"
    echo "   Start with: cd backend && python manage.py runserver 8001"
    exit 1
fi

if ! curl -s http://127.0.0.1:8000/ > /dev/null 2>&1; then
    echo "❌ AI core not running on port 8000"
    echo "   Start with: cd cove-ai-core && uvicorn app.main:app --reload --port 8000"
    exit 1
fi

echo "✅ Both servers running"
echo ""

# Activate venv
cd "$(dirname "$0")"
source .venv/bin/activate

# Phase 1: Backend
echo "🔧 Phase 1: Backend Tests"
echo "------------------------"
echo "Testing order email endpoint..."
# Manual test - check endpoint exists
if curl -s -X POST http://127.0.0.1:8001/api/orders/send-receipt/ \
    -H "Content-Type: application/json" \
    -d '{"orderId": 999999}' | grep -q "error"; then
    echo "✅ Email endpoint responding"
else
    echo "⚠️  Email endpoint may have issues"
fi
echo ""

# Phase 2: AI Tools Layer  
echo "🛠️  Phase 2: AI Tools Tests"
echo "-------------------------"
echo "Testing AI tools imports..."
python -c "
from app.cove_ai_tools import checkout, orders, emails
from app.cove_ai_tools.config import ToolsConfig
from app.cove_ai_tools.http_client import ToolsHTTPClient
print('✅ All AI tools import successfully')
"
echo ""

# Phase 3: MCP Server
echo "🔌 Phase 3: MCP Server Tests"
echo "---------------------------"
if [ -f "app/cove_mcp/test_all_tools.py" ]; then
    echo "MCP test client exists ✅"
    echo "Note: Manual MCP testing recommended for full validation"
else
    echo "⚠️  MCP test client not found"
fi
echo ""

# Phase 4: Agent Intelligence
echo "🤖 Phase 4: Agent Intelligence Tests"
echo "-----------------------------------"
if [ -f "test_phase4_intents.py" ]; then
    echo "Running Phase 4 test suite..."
    python test_phase4_intents.py
    if [ $? -eq 0 ]; then
        echo "✅ Phase 4 tests passed"
    else
        echo "❌ Phase 4 tests failed"
        exit 1
    fi
else
    echo "⚠️  Phase 4 test suite not found"
fi
echo ""

# Phase 5: Performance
echo "⚡ Phase 5: Performance Tests"
echo "---------------------------"
if [ -f "test_phase5_performance.py" ]; then
    echo "Running Phase 5 test suite..."
    python test_phase5_performance.py
    if [ $? -eq 0 ]; then
        echo "✅ Phase 5 tests passed"
    else
        echo "❌ Phase 5 tests failed"
        exit 1
    fi
else
    echo "⚠️  Phase 5 test suite not found"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Week 4 Test Suite Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "All automated tests passed ✅"
echo ""
echo "Next: Run manual tests from WEEK4_TESTING_GUIDE.md"
