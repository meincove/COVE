
import pytest
import asyncio
import sys
import os
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.agents.multi_agent_orchestrator import orchestrator

@pytest.mark.asyncio
async def test_fast_path_routing():
    """Test that keywords still work (Fast Path)"""
    # "build me a" is a trigger in orchestrator_workflows.json
    result = await orchestrator.should_handle("build me a summer outfit")
    assert result == "outfit_builder"

@pytest.mark.asyncio
async def test_knowledge_routing():
    """Test routing to Knowledge Agent via LLM"""
    
    # Mock LLM response for "knowledge_query"
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content='{"workflow": "knowledge_query"}'))
    ]
    
    with patch("litellm.acompletion", return_value=mock_response):
        result = await orchestrator.should_handle("What is smart casual?")
        assert result == "knowledge_query"

@pytest.mark.asyncio
async def test_support_routing():
    """Test routing to Support Agent via LLM"""
    
    # Mock LLM response for "support_request"
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content='{"workflow": "support_request"}'))
    ]
    
    with patch("litellm.acompletion", return_value=mock_response):
        result = await orchestrator.should_handle("I want to return this order")
        assert result == "support_request"

@pytest.mark.asyncio
async def test_general_chat_routing():
    """Test that generic queries return None (General Chat)"""
    
    # Mock LLM response for null
    mock_response = AsyncMock()
    mock_response.choices = [
        AsyncMock(message=AsyncMock(content='{"workflow": null}'))
    ]
    
    with patch("litellm.acompletion", return_value=mock_response):
        result = await orchestrator.should_handle("Hello there")
        assert result is None

if __name__ == "__main__":
    async def run_tests():
        print("Running test_fast_path_routing...")
        await test_fast_path_routing()
        print("PASS")
        
        print("Running test_knowledge_routing...")
        await test_knowledge_routing()
        print("PASS")
        
        print("Running test_support_routing...")
        await test_support_routing()
        print("PASS")
        
        print("Running test_general_chat_routing...")
        await test_general_chat_routing()
        print("PASS")
        
    asyncio.run(run_tests())
