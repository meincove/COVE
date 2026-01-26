import os
import asyncio
from litellm import image_generation
from dotenv import load_dotenv

load_dotenv()

async def test():
    try:
        print(f"Key: {os.getenv('OPENROUTER_API_KEY')[:10]}...")
        response = image_generation(
            model="openrouter/replicate/flux-1.1-pro",
            prompt="A minimalist white t-shirt on a ghost mannequin",
            api_key=os.getenv("OPENROUTER_API_KEY")
        )
        print(response)
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(test())
