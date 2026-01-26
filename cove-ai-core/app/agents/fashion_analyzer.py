"""
Fashion Analyzer Agent - Specialized visual extraction for fashion items.

This agent replaces generic vision with a structured "Fashion DNA" extractor.
"""

from app.agents.base_agent import BaseAgent, AgentResult
from typing import Dict, Any, List, Optional
import logging
import json
import os
import litellm

log = logging.getLogger("cove.agents.fashion_analyzer")

class FashionAnalyzerAgent(BaseAgent):
    """
    Fashion Analyzer: Extracts "Fashion DNA" from images.
    
    Attributes:
    - Silhouette (Oversized, Slim, Boxy)
    - Era (90s, Y2K, Modern, Vintage)
    - Vibe/Aesthetic (Gorpcore, Quiet Luxury, Streetwear, Boho)
    - Material/Texture (Leather, Denim, Silk, Knit)
    - Technical Color Palette (hex codes or precise names)
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any], stream_callback=None) -> AgentResult:
        image_url = task.get("imageUrl") or task.get("image_url")
        image_data = task.get("imageData")
        
        if not image_url and image_data:
            if not image_data.startswith("data:"):
                image_url = f"data:image/jpeg;base64,{image_data}"
            else:
                image_url = image_data

        if not image_url:
            return AgentResult(success=False, reasoning="No image input provided", confidence=0.0)

        log.info(f"👔 Analyzing Fashion DNA for image...")
        
        if stream_callback:
            await stream_callback({
                "event_type": "status",
                "message": "Extracting Fashion DNA (Silhouette, Era, Vibe)..."
            })

        try:
            model = os.getenv("VISION_MODEL", "openrouter/openai/gpt-4o")
            
            prompt = """You are a Senior Fashion Analyst. Your job is to decompose an image into a "Fashion DNA" profile for search indexing.

Return ONLY a JSON object with these technical fields:
1. silhouette: Description of the cut/fit (e.g., "Boxy", "A-Line", "Cropped", "Relaxed").
2. vibe: 1-2 core aesthetics (e.g., "Gorpcore", "Minimalist", "Old Money", "Y2K").
3. decade_influence: Primary era influence (e.g., "90s", "70s", "Modern").
4. core_item: Precise item name (e.g., "Double-Breasted Blazer", "Cargo Pants").
5. technical_color: Specific color name (e.g., "Midnight Blue", "Sage Green").
6. material_inference: Predicted fabric (e.g., "Technical Nylon", "Heavyweight Cotton").
7. search_tags: 5 optimized keywords to find visually identical items.

Output JSON only."""

            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
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
                temperature=0.0
            )
            
            analysis = json.loads(response.choices[0].message.content)
            log.info(f"👔 Fashion DNA Extracted: {analysis}")
            
            # Show the user what we found!
            if stream_callback:
                await stream_callback({
                    "event_type": "status",
                    "message": f"Detected {analysis.get('vibe')} vibe with {analysis.get('silhouette')} silhouette."
                })

            return AgentResult(
                success=True,
                data=analysis,
                reasoning=f"Identified item as {analysis.get('core_item')} with {analysis.get('vibe')} aesthetic.",
                confidence=0.95
            )

        except Exception as e:
            log.error(f"Fashion analysis failed: {e}")
            return AgentResult(success=False, errors=[str(e)], confidence=0.0)

# Handler wrapper
async def fashion_analyzer_handler(task: dict, context: dict, stream_callback=None) -> dict:
    agent = FashionAnalyzerAgent("fashion_analyzer")
    result = await agent.execute(task, context, stream_callback=stream_callback)
    return result.to_dict()

# Register
from app.core.agent_registry import registry, Agent

registry.register(Agent(
    name="fashion_analyzer",
    description="DNA extraction expert - decomposes fashion items into technical attributes",
    capabilities=["extract", "analyze", "vision", "fashion_dna"],
    handler=fashion_analyzer_handler,
    priority=20, # Higher than general vision
    config={}
))
