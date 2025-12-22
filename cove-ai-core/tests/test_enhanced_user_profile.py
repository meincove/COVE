
import pytest
import asyncio
import sys
import os
import uuid
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.services.feedback_manager import FeedbackManager, get_feedback_manager

@pytest.mark.asyncio
async def test_implicit_learning():
    """Test that clicking an item creates an implicit memory"""
    
    # Setup
    manager = FeedbackManager()
    user_id = f"test_user_feedback_{uuid.uuid4().hex[:6]}"
    
    item_metadata = {
        "title": "Navy Wool Blazer",
        "color": "Navy",
        "type": "Blazer",
        "style": "Formal"
    }
    
    # Process "click" -> Should be treated as implicit interest
    # We mock memory service to store it
    with patch("app.services.feedback_manager.get_memory_service") as mock_get_memory:
        mock_memory_service = AsyncMock()
        mock_get_memory.return_value = mock_memory_service
        mock_memory_service.store_memory.return_value = 12345 # Mock ID
        
        result = await manager.process_feedback(
            user_id=user_id,
            event_type="click",
            item_metadata=item_metadata
        )
        
        # Verify result
        assert result["processed"] is True
        assert result["memory_created"] is True
        assert result["memory_id"] == 12345
        
        # Verify what was stored
        mock_memory_service.store_memory.assert_called_once()
        call_kwargs = mock_memory_service.store_memory.call_args[1]
        
        content = call_kwargs["content"]
        assert "User interested in Navy Wool Blazer" in content
        assert "(Navy)" in content
        assert call_kwargs["memory_type"] == "implicit_preference"
        assert call_kwargs["confidence"] == 0.5 # Click = 0.5 confidence

@pytest.mark.asyncio
async def test_rejection_learning():
    """Test that rejecting an item creates a negative memory"""
    manager = FeedbackManager()
    user_id = "test_user_reject"
    
    item = {"title": "Bright Yellow Hoodie"}
    
    with patch("app.services.feedback_manager.get_memory_service") as mock_get_memory:
        mock_memory_service = AsyncMock()
        mock_get_memory.return_value = mock_memory_service
        
        await manager.process_feedback(user_id, "reject", item)
        
        call_kwargs = mock_memory_service.store_memory.call_args[1]
        assert "User rejected Bright Yellow Hoodie" in call_kwargs["content"]
        assert call_kwargs["memory_type"] == "implicit_dislike"

if __name__ == "__main__":
    async def run_tests():
        print("Running test_implicit_learning...")
        await test_implicit_learning()
        print("PASS")
        
        print("Running test_rejection_learning...")
        await test_rejection_learning()
        print("PASS")
        
    asyncio.run(run_tests())
