"""
VTO Agent - Virtual Try-On specialized agent.

Uses IDM-VTO model via Replicate to generate an image of the user
wearing a selected garment.
"""

import os
import logging
import asyncio
import replicate
import httpx
import uuid
import base64
from io import BytesIO
from PIL import Image
from typing import Dict, Any, List, Optional
from app.agents.base_agent import BaseAgent, AgentResult
from app.core.agent_registry import Agent, registry

log = logging.getLogger("cove.agents.vto")

# Helper to categorize items
def get_garment_category(item: Dict[str, Any]) -> str:
    text = ((item.get("type") or "") + " " + (item.get("title") or "")).lower()
    if any(x in text for x in ["dress", "gown", "jumpsuit"]):
        return "dresses"
    if any(x in text for x in ["pant", "jean", "trouser", "skirt", "short", "legging", "jogger"]):
        return "lower_body"
    return "upper_body" # Valid default for coats, shirts, etc.

async def compose_outfit_image(top_item: Dict, bottom_item: Dict) -> Optional[str]:
    """
    Downloads top and bottom images, stitches them vertically, 
    and returns a Data URI of the composite 'flat lay'.
    """
    try:
        top_img = await fetch_image(top_item["imageUrl"])
        bot_img = await fetch_image(bottom_item["imageUrl"])
        
        if not top_img or not bot_img:
            return None
        
        top_img = top_img.convert("RGBA")
        bot_img = bot_img.convert("RGBA")
        
        # Create canvas (768x1024 is standard VTO ratio 3:4)
        canvas_w, canvas_h = 768, 1024
        canvas = Image.new("RGB", (canvas_w, canvas_h), (255, 255, 255))
        
        # Resize logic (simple specific placement)
        # Top takes upper 55%, Bottom takes lower 45%
        
        # --- Place Top ---
        top_img.thumbnail((int(canvas_w * 0.9), int(canvas_h * 0.55)))
        top_x = (canvas_w - top_img.width) // 2
        top_y = int(canvas_h * 0.05)
        canvas.paste(top_img, (top_x, top_y), top_img if top_img.mode == 'RGBA' else None)
        
        # --- Place Bottom ---
        bot_img.thumbnail((int(canvas_w * 0.7), int(canvas_h * 0.45)))
        bot_x = (canvas_w - bot_img.width) // 2
        bot_y = int(canvas_h * 0.55)
        canvas.paste(bot_img, (bot_x, bot_y), bot_img if bot_img.mode == 'RGBA' else None)
        
        # Convert to Data URI
        buffered = BytesIO()
        canvas.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
            
    except Exception as e:
        log.error(f"Failed to compose outfit: {e}")
        return None

async def fetch_image(url: str) -> Optional[Image.Image]:
    """Helper to fetch image from URL or Local Path"""
    try:
        log.info(f"📥 Fetching image: {url}")
        
        clean_url = url.split("?")[0]
        
        # ✨ LOCAL FILE OPTIMIZATION (Broadened)
        # 1. Contains /static/
        # 2. Starts with / (relative)
        # 3. Contains localhost/127.0.0.1
        is_local = ("/static/" in clean_url) or clean_url.startswith("/") or \
                   any(h in clean_url for h in ["localhost", "127.0.0.1", "0.0.0.0"])

        if is_local:
            # Try to extract the relative path after /static/
            rel_path = ""
            if "/static/" in clean_url:
                rel_path = clean_url.split("/static/")[1]
            elif clean_url.startswith("/"):
                # Ensure we don't double-slash or miss static prefix if accidental
                rel_path = clean_url.lstrip("/")

            # ✨ HARDCODED ABSOLUTE PATH
            static_root = "/Users/ssg/Desktop/COVE/cove-ai-core/static"
            
            import urllib.parse
            clean_rel_path = urllib.parse.unquote(rel_path).lstrip("/")
            
            file_path = os.path.join(static_root, clean_rel_path)
            
            # Fuzzy match logic
            if not os.path.exists(file_path):
                try:
                    target_dir = os.path.dirname(file_path)
                    target_name = os.path.basename(file_path)
                    uuid_prefix = target_name[:36]
                    if os.path.exists(target_dir):
                        for f in os.listdir(target_dir):
                            if f.startswith(uuid_prefix):
                                file_path = os.path.join(target_dir, f)
                                break
                except Exception as ex:
                    log.warning(f"Fuzzy match failed: {ex}")

            if os.path.exists(file_path):
                log.info(f"📂 Reading local image from disk: {file_path}")
                return Image.open(file_path)
            else:
                log.warning(f"⚠️ Local file path absent: {file_path}")
                return None
        
        # Guard: NEVER try to fetch localhost via HTTP (avoids Connection Refused)
        if "localhost" in url or "127.0.0.1" in url or url.startswith("/"):
             log.warning(f"🚫 Skipping HTTP fetch for local URL: {url}")
             return None

        # Standard HTTP Fetch
        log.info(f"🌐 Fetching via HTTP: {url}")
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
            if resp.status_code == 200:
                return Image.open(BytesIO(resp.content))
            else:
                log.error(f"HTTP Error fetching {url}: {resp.status_code}")
                return None
                
    except Exception as e:
        log.error(f"Error fetching image {url}: {e}")
        return None

class VTOAgent(BaseAgent):
    """
    Virtual Try-On Agent: Renders garments on user images.
    Process:
    1. Identify the primary garment (usually the top/outerwear).
    2. Call Replicate's yisol/idm-vto model.
    3. Return the generated image URL.
    """

    async def execute(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any]
    ) -> AgentResult:
        """
        Execute VTO logic.
        """
        image_url = task.get("imageUrl") or context.get("imageUrl")
        image_data = task.get("imageData") or context.get("imageData")
        outfit_items = task.get("items", [])
        
        # We need a user image to proceed
        human_image = image_url or image_data
        
        # ✨ FIX: Ensure base64 data has URI prefix (Replicate requires 'data:' or 'http')
        if human_image and not human_image.startswith("http") and not human_image.startswith("data:"):
            human_image = f"data:image/png;base64,{human_image}"
            
        if not human_image:
            return AgentResult(
                success=True,
                data={},
                reasoning="No user image found, skipping VTO preview.",
                confidence=1.0
            )

        if not outfit_items:
            return AgentResult(
                success=False,
                data={},
                reasoning="No outfit items provided for try-on.",
                confidence=0.0,
                errors=["Missing outfit_items"]
            )

        # 1. Select the "Main Garment" for VTO
        # IDM-VTO works with a single garment. We must pick the most "defining" piece.
        # Priority: Outerwear > Tops > Dresses > Bottoms
        
        # 1. Select the "Main Garments" for VTO
        # We need the BEST Top (Outerwear > Shirt) and BEST Bottom.
        
        top_candidate = None
        top_priority = -1
        
        bottom_candidate = None
        dress_candidate = None
        
        priority_map = {
            "coat": 10, "jacket": 9, "blazer": 9, "outerwear": 9,
            "sweatshirt": 8, "hoodie": 8, "sweater": 8, "cardigan": 8,
            "shirt": 7, "top": 6, "blouse": 6,
            "t-shirt": 5, "tee": 5, "polo": 5,
            "vest": 4, "tank": 3
        }

        for item in outfit_items:
            category = get_garment_category(item)
            text = ((item.get("type") or "") + " " + (item.get("title") or "")).lower()
            
            if category == "upper_body":
                # Calculate priority
                p = 0
                for k, v in priority_map.items():
                    if k in text:
                        p = max(p, v)
                
                # Update if better found or first one
                if top_candidate is None or p > top_priority:
                    top_candidate = item
                    top_priority = p
                    
            elif category == "lower_body":
                # For bottoms, just take the first one (or could prioritize pants > shorts)
                if not bottom_candidate:
                    bottom_candidate = item
                    
            elif category == "dresses":
                dress_candidate = item
        
        # 2. Determine Strategy: Single Item vs Full Outfit
        garment_image = None
        category = "upper_body" # default
        description = "garment"
        
        use_composite = False
        
        if top_candidate and bottom_candidate:
            # ✨ MULTI-GARMENT MODE
            log.info("✨ Detected Full Outfit (Top + Bottom). Composing image...")
            composite_uri = await compose_outfit_image(top_candidate, bottom_candidate)
            
            if composite_uri:
                garment_image = composite_uri
                category = "dresses" # Triggers full-body generation
                description = f"{top_candidate.get('title')} and {bottom_candidate.get('title')}"
                use_composite = True
                main_garment = top_candidate # Just for logging
            else:
                log.warning("Failed to compose items, falling back to Top only.")
                
                # Convert fallback to Data URI if local
                img = await fetch_image(top_candidate.get("imageUrl"))
                if img:
                    buffered = BytesIO()
                    img.save(buffered, format="PNG")
                    garment_image = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"
                else:
                    garment_image = top_candidate.get("imageUrl")
                    
                category = "upper_body"
                description = top_candidate.get("title")
                main_garment = top_candidate
        
        elif dress_candidate:
            # Single Dress - Ensure Data URI
            img = await fetch_image(dress_candidate.get("imageUrl"))
            if img:
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                garment_image = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"
            else:
                garment_image = dress_candidate.get("imageUrl")
            
            category = "dresses"
            description = dress_candidate.get("title")
            main_garment = dress_candidate

        elif top_candidate:
            # Single Top - Ensure Data URI
            img = await fetch_image(top_candidate.get("imageUrl"))
            if img:
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                garment_image = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"
            else:
                garment_image = top_candidate.get("imageUrl")
            
            category = "upper_body"
            description = top_candidate.get("title")
            main_garment = top_candidate
            
        elif bottom_candidate:
             # Single Bottom - Ensure Data URI
            img = await fetch_image(bottom_candidate.get("imageUrl"))
            if img:
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                garment_image = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"
            else:
                garment_image = bottom_candidate.get("imageUrl")
            
            category = "lower_body"
            description = bottom_candidate.get("title")
            main_garment = bottom_candidate
            
        else:
            # Fallback to first item if no recognized garment found
            main_garment = outfit_items[0]
            img = await fetch_image(main_garment.get("imageUrl"))
            if img:
                buffered = BytesIO()
                img.save(buffered, format="PNG")
                garment_image = f"data:image/png;base64,{base64.b64encode(buffered.getvalue()).decode('utf-8')}"
            else:
                 garment_image = main_garment.get("imageUrl")
                 
            category = get_garment_category(main_garment) # Determine category for fallback
            description = main_garment.get("title")

        if not garment_image:
             return AgentResult(success=False, data={}, reasoning="No garment image found.", confidence=0.0)

        log.info(f"🎨 Starting VTO with category='{category}' for {description}")

        try:
            # 2. Call Replicate API
            # Note: Requires REPLICATE_API_TOKEN in environment
            if not os.getenv("REPLICATE_API_TOKEN"):
                raise ValueError("REPLICATE_API_TOKEN not set")

            # Model ID: yisol/idm-vto
            # See: https://replicate.com/yisol/idm-vto
            input_params = {
                "garm_img": garment_image,
                "human_img": human_image,
                "garment_des": description,
                "category": category,
                "is_checked": True,
                "is_checked_det": True,
                "denoise_steps": 30,
                "seed": 42
            }

            log.info(f"🚀 Calling Replicate IDM-VTO...")
            
            # Use run_in_executor to avoid blocking event loop if replicate client is synchronous
            # Or use replicate's async support if available
            loop = asyncio.get_event_loop()
            
            def call_replicate():
                # ✨ DYNAMIC VERSION: Fetch latest version preventing 422 errors
                model = replicate.models.get("cuuupid/idm-vton")
                version_id = model.latest_version.id
                return replicate.run(
                    f"cuuupid/idm-vton:{version_id}",
                    input=input_params
                )

            # Replicate.run is generally synchronous in the python client
            output = await loop.run_in_executor(None, call_replicate)
            
            log.info(f"🔍 Replicate Output Type: {type(output)}")
            log.info(f"🔍 Replicate Output Value: {output}")

            # Handle Generators (streaming output)
            if hasattr(output, '__iter__') and not isinstance(output, (list, str, dict)):
                output = list(output)
                log.info(f"🔍 Converted Generator to List: {output}")

            # ✨ HANDLING REPLICATE BINARY OUTPUT
            # The cuuupid/idm-vton model returns a FileOutput (iterator of bytes)
            # We must save this to a file and serving it locally.
            
            import uuid
            
            # 1. Determine local file path
            filename = f"vto_{uuid.uuid4().hex}.png"
            # Note: app/static is mounted at /static in main.py
            # Absolute path: .../cove-ai-core/static/vto/
            static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "static", "vto")
            os.makedirs(static_dir, exist_ok=True)
            file_path = os.path.join(static_dir, filename)
            
            # 2. Extract content
            chunks = []
            if hasattr(output, '__iter__') and not isinstance(output, (list, str)):
                 # It's an iterator (FileOutput)
                for chunk in output:
                    chunks.append(chunk) 
            elif isinstance(output, bytes):
                chunks.append(output)
            elif isinstance(output, list):
                 # Might be a list of bytes or list of one FileOutput
                 # Based on logs, it's likely iterable, but let's handle list-wrapping
                 for item in output:
                     if isinstance(item, bytes):
                         chunks.append(item)
                     elif hasattr(item, '__iter__'):
                         for sub in item:
                             chunks.append(sub)
            else:
                 # It might be a URL string?
                 if isinstance(output, str) and output.startswith("http"):
                     generated_url = output
                     chunks = None # Skip file save
                 else:
                     # Fallback
                     chunks = [str(output).encode('utf-8')]

            # 3. Save to file if we have chunks
            if chunks:
                with open(file_path, "wb") as f:
                    for chunk in chunks:
                        f.write(chunk)
                
                # 4. Construct URL 
                # Assuming running on localhost:8000 for now. 
                # Ideally use a config base URL, but we default to relative /static
                # Frontend is on :3000, Backend :8000. 
                # If we return "/static/...", frontend needs to know base.
                # Let's return full localhost URL for dev stability.
                base_url = os.getenv("NEXT_PUBLIC_AI_CORE_BASE_URL", "http://localhost:8000")
                generated_url = f"{base_url}/static/vto/{filename}"
                
                log.info(f"💾 Saved VTO image to {file_path}")
                
            log.info(f"✅ VTO Complete! Generated URL: {generated_url}")

            if not generated_url or generated_url == "None" or generated_url == "None":
                 return AgentResult(
                    success=False,
                    data={},
                    reasoning="Model returned no URL.",
                    confidence=0.0,
                    errors=["Model returned empty result"]
                )

            return AgentResult(
                success=True,
                data={
                    "vto_image_url": generated_url,
                    "main_garment_used": main_garment.get("title")
                },
                reasoning=f"Generated a virtual try-on preview with the {main_garment.get('title')}.",
                confidence=0.9,
                tools_used=["replicate_idm_vto"]
            )

        except Exception as e:
            log.error(f"❌ VTO Agent failed: {e}")
            return AgentResult(
                success=False,
                data={},
                reasoning="Failed to generate virtual try-on preview.",
                confidence=0.0,
                errors=[str(e)]
            )

# Register the agent
registry.register(Agent(
    name="vto_agent",
    description="Virtual Try-On agent using IDM-VTO",
    capabilities=["vto", "try-on", "preview"],
    handler=lambda task, context: VTOAgent("vto_agent").run(task, context)
))
