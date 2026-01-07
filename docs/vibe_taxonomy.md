# Vibe Taxonomy & Attribute Mapping 2024-2025 ✨

This document defines the mapping between abstract "Vibes" and concrete product attributes/keywords to power the Stylist Agent's retrieval logic.

## 1. Core Aesthetics (The "Vibes")

### 🔮 Modern / Trendy
| Vibe | Keywords / Attributes | Style Tags | Color Palette |
| :--- | :--- | :--- | :--- |
| **Y2K** | `cropped`, `slim fit`, `metallic`, `mini skirt` | `retro`, `party`, `streetwear` | `pink`, `baby blue`, `silver` |
| **Cyberpunk / Techwear** | `utility`, `oversized`, `waterproof`, `cargo`, `matte` | `tech`, `functional`, `streetwear`, `dark` | `black`, `charcoal`, `neon green` |
| **Coquette** | `slim fit`, `soft`, `delicate`, `mini` | `feminine`, `romantic`, `minimal` | `white`, `light pink`, `cream` |
| **Office Siren** | `slim fit`, `structured`, `minimalist`, `clean` | `office`, `formal`, `elegant`, `clean` | `grey`, `black`, `pinstripe`, `neutral` |
| **Mob Wife** | `oversized`, `leopard`, `leather`, `bold` | `glamour`, `luxury`, `party` | `gold`, `black`, `leopard` |
| **Eclectic Grandpa** | `knit`, `retro`, `relaxed fit`, `patterned` | `vintage`, `casual`, `cozy` | `brown`, `mustard`, `green`, `navy` |

### 🌿 Natural / Relaxed
| Vibe | Keywords / Attributes | Style Tags | Color Palette |
| :--- | :--- | :--- | :--- |
| **Cottagecore** | `linen`, `flowy`, `floral`, `puff sleeve` | `romantic`, `nature`, `vintage` | `sage green`, `beige`, `white`, `floral` |
| **Coastal Grandmother** | `linen`, `knit`, `relaxed fit`, `striped` | `classic`, `elegant`, `minimal` | `white`, `blue`, `beige`, `sand` |
| **Gorpcore** | `fleece`, `windbreaker`, `utility`, `functional` | `outdoors`, `hiking`, `tech` | `olive`, `brown`, `orange`, `black` |
| **Clean Girl** | `minimalist`, `matching set`, `bodysuit`, `slick` | `clean`, `gym`, `casual` | `beige`, `white`, `black`, `grey` |

### 🎸 Edgy / Alternative
| Vibe | Keywords / Attributes | Style Tags | Color Palette |
| :--- | :--- | :--- | :--- |
| **Indie Sleaze** | `distressed`, `leather`, `slim fit`, `graphic` | `grunge`, `rock`, `party` | `black`, `red`, `metallic` |
| **Grunge** | `plaid`, `oversized`, `flannel`, `ripped` | `90s`, `streetwear`, `casual` | `black`, `grey`, `red`, `plaid` |
| **Dark Academia** | `tweed`, `structured`, `knit`, `turtleneck` | `vintage`, `formal`, `classic` | `brown`, `black`, `forest green` |

## 2. Dynamic Attribute Injection

When a user mentions a vibe, the Agent should **inject** the corresponding hidden keywords into the search query.

**Example Logic:**
> **User:** "I want a mob wife aesthetic outfit."
> **Agent Internal Query:** `search_products(keywords=["faux fur", "leopard print", "leather", "black dress", "gold accessories"])`

## 3. Implementation Strategy (Phase 4)

1.  **`VibeTranslator` Class**: A Python utility that takes a user string and returns a list of "expanded" search terms.
2.  **Prompt Engineering**: Update the System Prompt to explicitly instruct the LLM to identify the "Vibe" first, then translate it using its internal knowledge (augmented by RAG if needed).
3.  **Tagging (Optional)**: If possible, auto-tag existing products in `productVariantsFlat.json` with these vibes based on their descriptions (Background Job).
