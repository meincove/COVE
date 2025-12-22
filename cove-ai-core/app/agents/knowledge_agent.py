import logging
import json
import os
from typing import Dict, Any, List
import litellm
from app.core.agent_registry import registry, Agent

log = logging.getLogger("cove.agents.knowledge")

class KnowledgeAgent:
    """
    Answers general fashion knowledge questions using RAG (simulated or real).
    e.g. "What is smart casual?", "How to match navy blazer?"
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute knowledge query.
        """
        query = task.get("query", "")
        log.info(f"📚 KnowledgeAgent answering: {query}")
        
        try:
            # Ask LLM 
            # Normalize model format (openrouter: → openrouter/)
            model = os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini").replace("openrouter:", "openrouter/")
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {
                        "role": "system", 
                        "content": """You are a Fashion Knowledge Expert.
Your goal is to answer broad fashion questions educationally and concisely.
Do NOT try to sell specific products. Explain CONCEPTS.

Examples:
- "What is smart casual?" -> Explain the dress code.
- "Does brown go with black?" -> Explain the color theory rules.
"""
                    },
                    {
                        "role": "user", 
                        "content": query
                    }
                ]
            )
            
            answer = response.choices[0].message.content
            
            return {
                "success": True,
                "agent": "knowledge",
                "data": {},
                "reasoning": answer
            }
            
        except Exception as e:
            log.error(f"KnowledgeAgent failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "reasoning": "I couldn't access my fashion knowledge base right now."
            }

# Register self
agent = KnowledgeAgent()

registry.register(Agent(
    name="knowledge",
    description="Answers general fashion questions and explains style concepts",
    capabilities=["question", "what is", "how to", "style advice", "fashion knowledge"],
    handler=agent.execute,
    priority=1
))
