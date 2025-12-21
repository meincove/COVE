"""
VisualValidator - Week 3 Day 1
Visual intelligence for outfit validation using GPT-4o Vision.

Analyzes outfit images for:
1. Color Harmony (clashing colors?)
2. Style Consistency (formal blazer with sweatpants?)
3. Pattern Balance (too many stripes?)
"""

import litellm
import logging
from typing import List, Dict, Optional
import json

log = logging.getLogger(__name__)


class VisualValidator:
    """
    Validates outfit visual harmony using Multi-Modal LLM (GPT-4o).
    """
    
    def __init__(self, model: str = "openrouter/openai/gpt-4o"):
        self.model = model
    
    async def validate_outfit(self, items: List[Dict]) -> Dict:
        """
        Analyze an outfit for visual harmony.
        
        Args:
            items: List of product items with 'image_url' and 'title'
            
        Returns:
            {
                "is_harmonious": bool,
                "score": 0.85,  # 0-1 score
                "critique": "The navy blazer pairs well with...",
                "issues": ["Colors clash", "Formal/Casual mismatch"]
            }
        """
        # Filter items with images
        valid_items = [item for item in items if item.get("image_url")]
        
        if len(valid_items) < 2:
            return {
                "is_harmonious": True, 
                "score": 1.0, 
                "critique": "Single item looks good.", 
                "issues": []
            }

        # Prepare image content for GPT-4o
        content = [{
            "type": "text", 
            "text": "Analyze this outfit for visual harmony. Check color matching, style consistency (formal vs casual), and pattern balance. Be a strict fashion critic."
        }]
        
        for item in valid_items:
            content.append({
                "type": "image_url",
                "image_url": {"url": item["image_url"]}
            })
            content.append({
                "type": "text",
                "text": f"Item: {item.get('title', 'Unknown Product')}"
            })

        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{
                    "role": "system", 
                    "content": """You are a high-end fashion stylist. Analyze the provided garment images as a complete outfit.
                    
Return JSON:
{
    "score": 0.0-1.0, (1.0 = perfect match, <0.7 = clash)
    "critique": "One sentence summary of the look.",
    "issues": ["List of specific visual problems"],
    "is_harmonious": boolean (true if score > 0.7)
}"""
                }, {
                    "role": "user",
                    "content": content
                }],
                response_format={"type": "json_object"},
                max_tokens=300
            )
            
            result = json.loads(response.choices[0].message.content)
            log.info(f"🎨 Visual validation result: {result['score']} - {result['critique']}")
            return result
            
        except Exception as e:
            log.error(f"Visual validation failed: {e}")
            # Fail open (assume good if vision fails)
            return {
                "is_harmonious": True,
                "score": 0.0,
                "critique": "Could not validate visually.",
                "issues": [str(e)]
            }
