
import pytest
import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from unittest.mock import AsyncMock, patch
from app.services.conversation_manager import ConversationManager

@pytest.mark.asyncio
async def test_history_management():
    """Test basic history add/get/trim operations"""
    manager = ConversationManager()
    user_id = "test_user_1"
    
    # Add messages
    manager.add_message(user_id, "user", "Hello")
    manager.add_message(user_id, "assistant", "Hi there")
    
    history = manager.get_history(user_id)
    assert len(history) == 2
    assert history[0]["content"] == "Hello"
    assert history[1]["role"] == "assistant"
    
    # Test trim limit (max 10)
    for i in range(15):
        manager.add_message(user_id, "user", f"msg {i}")
        
    history = manager.get_history(user_id)
    assert len(history) == 10
    assert history[-1]["content"] == "msg 14"

@pytest.mark.asyncio
async def test_resolve_intent_new_topic():
    """Test resolution when history is empty"""
    manager = ConversationManager()
    user_id = "test_user_2"
    
    result = await manager.resolve_intent(user_id, "Show me shoes")
    
    # If no history, should return original query as new_topic
    assert result["resolved_query"] == "Show me shoes"
    assert result["modification_type"] == "new_topic"

@pytest.mark.asyncio
async def test_resolve_intent_follow_up():
    """Test resolution with LLM mock for follow-up"""
    manager = ConversationManager()
    user_id = "test_user_3"
    
    # Add history
    manager.add_message(user_id, "user", "Show me blue blazers")
    manager.add_message(user_id, "assistant", "Here are some options...")
    
    # Mock LLM response
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content='{"resolved_query": "Show me cheaper blue blazers", "modification_type": "refinement", "reasoning": "Merged cheaper constraint"}'))
    ]
    
    with patch("litellm.acompletion", return_value=mock_response) as mock_llm:
        result = await manager.resolve_intent(user_id, "Make it cheaper")
        
        assert result["resolved_query"] == "Show me cheaper blue blazers"
        assert result["modification_type"] == "refinement"
        
        # Verify LLM call
        call_kwargs = mock_llm.call_args[1]
        assert "messages" in call_kwargs
        messages = call_kwargs["messages"]
        assert len(messages) == 2
        assert "Show me blue blazers" in messages[1]["content"]

if __name__ == "__main__":
    # Manual run wrapper
    async def run_tests():
        print("Running test_history_management...")
        await test_history_management()
        print("PASS")
        
        print("Running test_resolve_intent_new_topic...")
        await test_resolve_intent_new_topic()
        print("PASS")
        
        print("Running test_resolve_intent_follow_up...")
        await test_resolve_intent_follow_up()
        print("PASS")
        
    asyncio.run(run_tests())
