"""
Vision Agent - Multimodal analysis of user images.

Uses GPT-4o (Vision) via OpenRouter to extract fashion attributes from uploaded images.
"""

from app.agents.base_agent import BaseAgent, AgentResult
from typing import Dict, Any, List, Optional
import logging
import json
import os
import litellm

log = logging.getLogger("cove.agents.vision")

class VisionAgent(BaseAgent):
    """
    Vision Agent: Analyzes images to extract fashion metadata.
    
    Capabilities:
    - Identify clothing items (category)
    - Detect color, pattern, material
    - Infer style (boho, formal, street)
    - Suggest occasion
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any], stream_callback=None) -> AgentResult:
        """
        Analyze an image for fashion attributes.
        """
        # Handle various input formats
        image_url = task.get("imageUrl") or task.get("image_url")
        image_data = task.get("imageData")
        
        # If we have base64 but no URL, format as data URL for LiteLLM
        if not image_url and image_data:
            if not image_data.startswith("data:"):
                image_url = f"data:image/jpeg;base64,{image_data}"
            else:
                image_url = image_data

        user_query = task.get("query", "Describe this outfit and find similar items.")
        
        if not image_url:
            return AgentResult(success=False, reasoning="No image input provided (imageUrl or imageData)", confidence=0.0)

        log.info(f"👁️ Analyzing image input with query: '{user_query}'")
        
        if stream_callback:
            await stream_callback({
                "event_type": "status",
                "message": "Analyzing your image for style matching..."
            })

        try:
            # Construct Multimodal Prompt
            model = os.getenv("VISION_MODEL", "openrouter/openai/gpt-4o")
            
            prompt = """Analyze this fashion image. Extract the following attributes in JSON format:
1. main_item: The primary piece of clothing (e.g. "Dress", "Blazer").
2. color: Dominant color name.
3. style: The aesthetic style (e.g. "Boho", "Minimalist", "Streetwear").
4. occasion: Best occasion for this item.
5. keywords: List of 5 search keywords to find similar items.
6. gender: Predicted gender (men/women/unisex).

Output JSON only."""

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": f"{prompt}\n\nContext Query: {user_query}"},
                        {
                            "type": "image_url",
                            "image_url": {"url": image_url}
                        }
                    ]
                }
            ]

            response = await litellm.acompletion(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            analysis = json.loads(content)
            
            log.info(f"👁️ Vision Analysis: {analysis}")
            
            # Format result for the Stylist or Search
            # structure matching what StylistAgent expects in "analysis"
            stylist_intent = {
                "gender": analysis.get("gender", "unisex"),
                "occasion": analysis.get("occasion", "any"),
                "style": analysis.get("style", "casual"),
                "categories": [analysis.get("main_item", "top")], 
                "reasoning": f"Based on your image of a {analysis.get('color')} {analysis.get('main_item')}, I'm looking for matching styles."
            }
            
            # Extract tags for search bias
            tags = analysis.get("keywords", [])
            color = analysis.get("color", "")
            if color and color not in tags:
                tags.append(color)
            
            description = f"a {analysis.get('style', 'stylish')} {analysis.get('main_item', 'clothing item')}"

            return AgentResult(
                success=True,
                data={
                    "vision_analysis": analysis,
                    "stylist_intent": stylist_intent,
                    "tags": tags,
                    "description": description,
                    "is_visual_search": True
                },
                reasoning=f"Analyzed image as {description}",
                confidence=0.9
            )

        except Exception as e:
            log.error(f"Vision analysis failed: {e}")
            return AgentResult(
                success=False, 
                errors=[str(e)], 
                reasoning="Failed to analyze image", 
                confidence=0.0
            )

# Handler wrapper
async def vision_handler(task: dict, context: dict, stream_callback=None) -> dict:
    agent = VisionAgent("vision")
    result = await agent.execute(task, context, stream_callback=stream_callback)
    return result.to_dict()

# Register
from app.core.agent_registry import registry, Agent

registry.register(Agent(
    name="vision",
    description="Visual analysis expert - extracts style from images",
    capabilities=["vision", "image", "upload", "photo", "see"],
    handler=vision_handler,
    priority=15, # Higher than stylist to intercept image tasks
    config={}
))
