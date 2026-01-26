import sys
import os
import asyncio
import argparse
import json
import logging
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from litellm import image_generation
from app.vector.store import get_conn_sync
import sqlite3
import re
import httpx

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
log = logging.getLogger("asset_gen")

# Constants
MODEL_NAME = os.getenv("IMAGE_GEN_MODEL", "openrouter/black-forest-labs/flux.2-pro")
FAL_KEY = os.getenv("FAL_KEY")

# Global pipeline cache for local gen
_local_pipe = None

async def download_image(url: str, save_path: str) -> bool:
    """Download image from URL or decode base64 data to local disk."""
    try:
        # Handle base64 data URI
        if url.startswith("data:image"):
            try:
                import base64
                # format: data:image/png;base64,iVBORw...
                header, encoded = url.split(",", 1)
                data = base64.b64decode(encoded)
                with open(save_path, "wb") as f:
                    f.write(data)
                return True
            except Exception as e:
                log.error(f"❌ Error decoding base64 image: {e}")
                return False

        # Handle normal URL
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                with open(save_path, "wb") as f:
                    f.write(resp.content)
                return True
            else:
                log.warning(f"⚠️ Failed to download image from {url}: {resp.status_code}")
                return False
    except Exception as e:
        log.error(f"❌ Error downloading image {url}: {e}")
        return False

async def generate_image(prompt: str, model: str, product_id: str = None) -> str:
    """
    Generate image using hierarchical strategy:
    1. Local (Diffusers on Mac) - Free (PRIORITY)
    2. Fal.ai (Flux/SDXL) - Cheap ($0.002)
    3. LiteLLM (OpenRouter/OpenAI) - Expensive ($0.04 - $0.08)
    4. Mock - Free
    """
    global _local_pipe
    
    # Strategy 1: Local Generation (Free) - Try this FIRST if dependencies available
    # Set DISABLE_LOCAL=1 to skip local generation
    if not os.getenv("DISABLE_LOCAL"):
        try:
            import torch
            from diffusers import StableDiffusionXLPipeline, AutoencoderKL
            
            log.info(f"💻 Attempting LOCAL generation for {product_id} (Free)...")
            
            if _local_pipe is None:
                log.info("⏳ Loading SDXL Turbo model locally (this happens once, ~7GB download)...")
                # Use SDXL Turbo for speed on Mac
                # Using float32 for stability on MPS to avoid black images
                _local_pipe = StableDiffusionXLPipeline.from_pretrained(
                    "stabilityai/sdxl-turbo", 
                    torch_dtype=torch.float32, # Switch to float32 for MPS stability
                )
                if torch.backends.mps.is_available():
                    _local_pipe = _local_pipe.to("mps")
                    # Recommended optimization for Mac
                    _local_pipe.enable_attention_slicing()
                    log.info("✅ Using Mac GPU (MPS) with float32 for stable generation")
                else:
                    _local_pipe = _local_pipe.to("cpu")
                    log.info("⚠️ Using CPU (slow).")
            
            # Generate
            log.info(f"🎨 Generating locally: '{prompt[:50]}...'")
            image = _local_pipe(prompt=prompt, num_inference_steps=2, guidance_scale=0.0).images[0] # Turbo needs 1-4 steps
            
            # Save to disk and serve
            # Use product_id + slugified title for clear traceability
            slug = re.sub(r'[^a-zA-Z0-9]', '_', prompt.split(',')[0].replace("Professional high-end e-commerce product photography of ", "").strip())
            filename = f"{product_id}_{slug}.jpg" if product_id else f"asset_{hash(prompt)}.jpg"
            save_path = os.path.join(os.path.dirname(__file__), "..", "static", "generated_assets", filename)
            os.makedirs(os.path.dirname(save_path), exist_ok=True)
            image.save(save_path)
            
            log.info(f"✅ Saved to {save_path}")
            # Return relative URL (assuming static file serving)
            return f"/static/generated_assets/{filename}"
            
        except ImportError:
            log.info("ℹ️ Local generation unavailable (diffusers not installed)")
        except Exception as e:
            log.warning(f"⚠️ Local generation failed: {e}, falling back to cloud...")

    # Strategy 2: Fal.ai (Cheap)
    if FAL_KEY:
        try:
            log.info(f"⚡ Generating via Fal.ai (Flux): '{prompt[:50]}...'")
            import fal_client
            handler = await asyncio.to_thread(
                fal_client.submit,
                "fal-ai/flux/schnell",
                arguments={"prompt": prompt, "image_size": "square_hd"}
            )
            result = await asyncio.to_thread(lambda: handler.get())
            return result["images"][0]["url"]
        except ImportError:
            log.warning("⚠️ Fal key found but 'fal-client' not installed.")
        except Exception as e:
            log.error(f"❌ Fal generation failed: {e}")

    # Strategy 3: LiteLLM (OpenRouter/DALL-E)
    # Strategy 3: OpenRouter Direct (Multi-Modal Chat API)
    if os.getenv("OPENROUTER_API_KEY"):
        try:
            # Clean model ID
            clean_model = model.replace("openrouter/", "")
            log.info(f"🎨 Generating via OpenRouter Chat API ({clean_model}): '{prompt[:50]}...'")
            
            headers = {
                "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY')}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://wearcove.ai",
                "X-Title": "COVE AI Asset Gen"
            }
            
            payload = {
                "model": clean_model,
                "messages": [
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                "modalities": ["image", "text"]
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                resp = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers=headers,
                    json=payload
                )
                
                if resp.status_code == 200:
                    data = resp.json()
                    # OpenRouter multimodal response parsing
                    try:
                        message = data["choices"][0]["message"]
                        if "images" in message and len(message["images"]) > 0:
                            cloud_url = message["images"][0]["image_url"]["url"]
                        elif "content" in message and isinstance(message["content"], list):
                            # Handle standard OpenAI multimodal format just in case
                            cloud_url = next((item["image_url"]["url"] for item in message["content"] if item["type"] == "image_url"), None)
                        else:
                            log.warning(f"⚠️ No image URL found in OpenRouter response: {data}")
                            return None
                            
                        if not cloud_url:
                            return None

                        # Download cloud image to local generated_assets folder
                        slug = re.sub(r'[^a-zA-Z0-9]', '_', prompt.split(',')[0].replace("Professional high-end e-commerce product photography of ", "").strip())
                        filename = f"{product_id}_{slug}.jpg" if product_id else f"cloud_{hash(prompt)}.jpg"
                        save_path = os.path.join(os.path.dirname(__file__), "..", "static", "generated_assets", filename)
                        os.makedirs(os.path.dirname(save_path), exist_ok=True)
                        
                        if await download_image(cloud_url, save_path):
                            log.info(f"💾 Cloud image downloaded to: {save_path}")
                            return f"/static/generated_assets/{filename}"
                        return cloud_url
                    except (KeyError, IndexError) as e:
                        log.error(f"❌ Failed to parse OpenRouter response: {e}")
                else:
                    log.warning(f"⚠️ OpenRouter Chat API failed with {resp.status_code}: {resp.text}")
        except Exception as e:
            log.warning(f"⚠️ OpenRouter Direct failed: {e}")

    # Strategy 4: Mock (Fallback)
    log.warning(f"⚠️ All generation methods failed. Using Mock.")
    import urllib.parse
    safe_prompt = urllib.parse.quote(prompt[:100])
    return f"https://placehold.co/1024x1024/EEE/31343C?text={safe_prompt}"

def get_products(limit: int = 10, offset: int = 0) -> List[Dict[str, Any]]:
    """Fetch products from DB."""
    query = """
        SELECT id, title, meta 
        FROM ai_core.docs 
        WHERE kind='product' 
        ORDER BY id 
        LIMIT %s OFFSET %s
    """
    products = []
    with get_conn_sync() as conn:
        with conn.cursor() as cur:
            cur.execute(query, (limit, offset))
            rows = cur.fetchall()
            for r in rows:
                products.append({
                    "id": r[0],
                    "title": r[1],
                    "meta": r[2]
                })
    return products

def update_product_image(product_id: str, image_url: str):
    """Update product metadata in both Postgres (AI) and SQLite (Frontend)."""
    
    # 1. Update PostgreSQL (AI_CORE)
    pg_query = """
        UPDATE ai_core.docs 
        SET meta = jsonb_set(meta, '{imageUrl}', %s::jsonb) 
        WHERE id = %s
    """
    try:
        with get_conn_sync() as conn:
            with conn.cursor() as cur:
                cur.execute(pg_query, (f'"{image_url}"', product_id))
        log.info(f"✅ Updated Postgres for {product_id}")
    except Exception as e:
        log.error(f"❌ Failed to update Postgres for {product_id}: {e}")

    # 2. Update SQLite (Frontend)
    sqlite_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "backend", "db.sqlite3"))
    try:
        with sqlite3.connect(sqlite_path) as conn:
            cur = conn.cursor()
            
            # Update variant image mapping
            # Note: product_id in Postgres corresponds to variant_id in catalog_productimage
            cur.execute("DELETE FROM catalog_productimage WHERE variant_id = ?", (product_id,))
            cur.execute("INSERT INTO catalog_productimage (variant_id, image_name) VALUES (?, ?)", (product_id, image_url))
            
            conn.commit()
        log.info(f"✅ Updated SQLite for {product_id}")
    except Exception as e:
        log.error(f"❌ Failed to update SQLite for {product_id}: {e}")

def construct_prompt(title: str, meta: Dict[str, Any]) -> str:
    """Construct a high-quality prompt for SDXL with maximum metadata alignment."""
    color = meta.get("color", "")
    p_type = meta.get("type", meta.get("category", "clothing item"))
    gender = meta.get("gender", "")
    material = meta.get("material", "")
    details = meta.get("details", "")
    
    # Core description
    description = f"{gender} {color} {title}" if gender else f"{color} {title}"
    if material:
        description += f" made of {material}"
    
    base_prompt = f"Professional high-end e-commerce product photography of {description}"
    
    # Specific style modifiers to ensure consistency across 2000 items
    style_modifiers = (
        "ghost mannequin style, neutral white studio background, "
        "even studio lighting, no shadows, sharp focus, 8k resolution, "
        "minimalist fashion photography, highly detailed texture"
    )
    
    full_prompt = f"{base_prompt}. {style_modifiers}."
    if details:
        full_prompt += f" Featuring {details}."
        
    return full_prompt

async def process_batch(args):
    """Main processing loop."""
    log.info(f"🚀 Starting Asset Generation Batch (Dry Run: {args.dry_run})")
    
    offset = 0
    total_processed = 0
    
    while total_processed < args.limit:
        batch_size = min(5, args.limit - total_processed) # Small concurrent batches
        products = get_products(limit=batch_size, offset=offset)
        
        if not products:
            break
            
        for p in products:
            title = p["title"]
            meta = p["meta"]
            
            # Skip if already fixed? (Optional logic)
            # if "fal.ai" in meta.get("imageUrl", "") or "openai" in meta.get("imageUrl", ""):
            #     log.info(f"⏭️  Skipping {title} (already has AI asset)")
            #     continue

            prompt = construct_prompt(title, meta)
            
            if args.dry_run:
                log.info(f"[DRY RUN] Would generate for '{title}': {prompt}")
                log.info(f"[DRY RUN] Would update DB for id={p['id']}")
            else:
                image_url = await generate_image(prompt, MODEL_NAME, p["id"])
                if image_url:
                    update_product_image(p["id"], image_url)
                    log.info(f"✅ Updated {title} -> {image_url}")
                else:
                    log.warning(f"⚠️ Failed to update {title}")
            
            total_processed += 1
            if total_processed >= args.limit:
                break
                
        offset += batch_size

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate AI assets for products")
    parser.add_argument("--limit", type=int, default=5, help="Number of products to process")
    parser.add_argument("--dry-run", action="store_true", default=True, help="Simulate without generating")
    parser.add_argument("--no-dry-run", action="store_false", dest="dry_run", help="Actually execute generation")
    
    args = parser.parse_args()
    
    asyncio.run(process_batch(args))
