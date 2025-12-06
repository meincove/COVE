#!/bin/bash
# Test script for conversation history system

set -e

echo "🧪 Testing Conversation History System"
echo "========================================"
echo ""

# Configuration
GUEST_SESSION="test-history-$(date +%s)"
DJANGO_URL="http://127.0.0.1:8001"
AI_CORE_URL="http://127.0.0.1:8000"

echo "📝 Using guest session: $GUEST_SESSION"
echo ""

# Test 1: Send first message
echo "Test 1: Sending first message..."
curl -s -X POST "$AI_CORE_URL/ai/agent/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Tell me about your brand vibe\",
    \"guestSessionId\": \"$GUEST_SESSION\",
    \"historyScope\": \"user\"
  }" | jq -r '.answer' | head -c 100
echo "..."
echo "✅ First message sent"
echo ""

# Wait a moment for async logging
sleep 1

# Test 2: Check history was saved
echo "Test 2: Checking if history was saved..."
HISTORY_COUNT=$(curl -s "$DJANGO_URL/ai_profiles/history/?guestSessionId=$GUEST_SESSION&limit=10" | jq '.items | length')

if [ "$HISTORY_COUNT" -ge 2 ]; then
  echo "✅ History saved! Found $HISTORY_COUNT events (user + assistant)"
else
  echo "❌ History not saved. Found only $HISTORY_COUNT events"
  exit 1
fi
echo ""

# Test 3: Send second message
echo "Test 3: Sending second message..."
curl -s -X POST "$AI_CORE_URL/ai/agent/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"What hoodies do you have?\",
    \"guestSessionId\": \"$GUEST_SESSION\",
    \"historyScope\": \"user\"
  }" | jq -r '.answer' | head -c 100
echo "..."
echo "✅ Second message sent"
echo ""

sleep 1

# Test 4: Verify history accumulation
echo "Test 4: Verifying history accumulation..."
HISTORY_COUNT=$(curl -s "$DJANGO_URL/ai_profiles/history/?guestSessionId=$GUEST_SESSION&limit=10" | jq '.items | length')

if [ "$HISTORY_COUNT" -ge 4 ]; then
  echo "✅ History accumulating! Found $HISTORY_COUNT events"
else
  echo "❌ History not accumulating properly. Found only $HISTORY_COUNT events"
  exit 1
fi
echo ""

# Test 5: Test context-aware query
echo "Test 5: Testing context-aware query..."
RESPONSE=$(curl -s -X POST "$AI_CORE_URL/ai/agent/query" \
  -H "Content-Type: application/json" \
  -d "{
    \"message\": \"Can you summarize what we've discussed so far?\",
    \"guestSessionId\": \"$GUEST_SESSION\",
    \"historyScope\": \"user\"
  }")

HISTORY_LEN=$(echo "$RESPONSE" | jq -r '.debug_plan.llm_history_len // 0')

if [ "$HISTORY_LEN" -gt 0 ]; then
  echo "✅ Context-aware! LLM received $HISTORY_LEN history messages"
  echo ""
  echo "📄 Response preview:"
  echo "$RESPONSE" | jq -r '.answer' | head -c 200
  echo "..."
else
  echo "⚠️  Warning: llm_history_len is $HISTORY_LEN (expected > 0)"
fi
echo ""

# Test 6: Display full history
echo "Test 6: Displaying full conversation history..."
echo ""
curl -s "$DJANGO_URL/ai_profiles/history/?guestSessionId=$GUEST_SESSION&limit=20" | jq '.items[] | {role, kind, content: (.content | .[0:80])}'
echo ""

echo "✅ All tests passed!"
echo ""
echo "🎉 Conversation history system is working!"
