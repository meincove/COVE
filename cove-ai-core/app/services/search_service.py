from typing import Dict, Any, List
import logging
from app.vector.store import _search_hybrid_rrf_sync, run_in_threadpool
from app.providers.embedding import embed_query as async_embed_query

log = logging.getLogger("cove.services.search")

async def search_products_hybrid(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Direct wrapper around hybrid search for agent recommendations.
    Extracted from app.routes.agent to avoid circular dependencies.
    """
    try:
        query = payload.get("query", "")
        filters = payload.get("filters", {})
        top_k = payload.get("top_k", 20)
        
        # Standard top-level imports now work because this service 
        # doesn't import agents or routes.
        
        q_emb = await async_embed_query(query)
        items = await run_in_threadpool(
            _search_hybrid_rrf_sync,
            query=query,
            q_emb=q_emb,
            kind="product",
            top_k=top_k,
            filters=filters
        )
        
        return {"items": items}
    except Exception as e:
        log.exception(f"Search service failed: {e}")
        return {"items": []}
