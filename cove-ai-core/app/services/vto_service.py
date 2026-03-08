"""
Virtual Try-On (VTO) Service.

Connects to IDM-VTON model (via Fal.ai or Replicate) to generate try-on images.
Default implementation uses Fal.ai 'idm-vton' endpoint.
"""

import os
import logging
import asyncio
from typing import Optional, Dict, Any
import aiohttp

log = logging.getLogger("cove.services.vto")

class VTOService:
    def __init__(self):
        self.api_key = os.getenv("FAL_KEY")
        # FAL IDM-VTON: ~$0.05 - $0.10 per image
        self.endpoint = "fal-ai/idm-vton" 
        
    async def try_on(self, person_image_url: str, garment_image_url: str, category: str = "upper_body") -> Dict[str, Any]:
        """
        Generate VTO image.
        
        Cost Note: Fal.ai 'idm-vton' costs approx $0.05/image. 
        Local generation of IDM-VTON requires robust GPU (16GB+ VRAM), difficult on Mac.
        """
        if not self.api_key:
            log.warning("⚠️ No FAL_KEY found. Using Mock VTO (Set FAL_KEY to enable ~$0.05/img generation).")
            return self._mock_generation(person_image_url, garment_image_url)

        try:
            log.info(f"👗 VTO Request: {category} try-on via {self.endpoint}")
            
            # Using raw aiohttp to avoid dependency on fal-client if not installed
            import fal_client # Prefer client if available
            
            handler = await asyncio.to_thread(
                fal_client.submit,
                self.endpoint,
                arguments={
                    "human_image_url": person_image_url,
                    "garm_img_url": garment_image_url,
                    "category": category,
                    "garment_des": "clothing item" # Optional caption
                }
            )
            
            # Long-polling for result
            result = await asyncio.to_thread(lambda: handler.get())
            
            log.info(f"✅ VTO Success: {result}")
            return {"url": result.get("image", {}).get("url")}

        except ImportError:
             log.error("❌ fal_client not installed. Please install 'fal-client'.")
             return self._mock_generation(person_image_url, garment_image_url)
        except Exception as e:
            log.error(f"❌ VTO Failed: {e}")
            return self._mock_generation(person_image_url, garment_image_url, error=str(e))

    def _mock_generation(self, user_url: str, garment_url: str, error: str = None) -> Dict[str, Any]:
        """Return a placeholder for testing UI flows."""
        import urllib.parse
        
        status = "MOCK_VTO"
        if error:
            status += f"_ERROR_{error[:20]}"
            
        mock_url = f"https://placehold.co/1024x1024/2563EB/ffffff?text={urllib.parse.quote(status)}"
        return {
            "url": mock_url, 
            "is_mock": True,
            "original_error": error
        }

# Global singleton
vto_service = VTOService()
