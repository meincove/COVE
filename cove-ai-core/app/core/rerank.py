# app/ai_core/rerank.py
from __future__ import annotations
from typing import List, Dict, Any, Sequence
import math

Vector = Sequence[float]
Doc = Dict[str, Any]


def _l2_normalize(vec: Vector) -> List[float]:
    norm = math.sqrt(sum(x * x for x in vec))
    if norm == 0:
        return [0.0 for _ in vec]
    return [x / norm for x in vec]


def _cosine_sim(a: Vector, b: Vector) -> float:
    return sum(x * y for x, y in zip(a, b))


def mmr_rerank_from_vectors(
    query_embedding: Vector,
    doc_embeddings: List[Vector],
    docs: List[Doc],
    lambda_mult: float = 0.55,
    top_k: int | None = None,
) -> List[Doc]:
    """
    MMR reranker using separate doc embeddings (no need to store them in docs).

    Parameters
    ----------
    query_embedding : Vector
        Embedding of the query.
    doc_embeddings : list[Vector]
        Embeddings for docs, same order as `docs`.
    docs : list[dict]
        Original docs.
    lambda_mult : float
        Trade-off between relevance and diversity.
    top_k : int | None
        Number of docs to keep. If None, keeps len(docs).

    Returns
    -------
    list[dict]
        Docs reordered by MMR, with an added 'mmr_score' key.
    """
    if not docs or not doc_embeddings:
        return docs

    n = min(len(docs), len(doc_embeddings))
    docs = docs[:n]
    doc_embeddings = doc_embeddings[:n]

    top_k = top_k or n
    top_k = min(top_k, n)

    q_vec = _l2_normalize(query_embedding)
    doc_vecs = [_l2_normalize(v) for v in doc_embeddings]

    # Relevance to query
    relevance = [_cosine_sim(q_vec, dv) for dv in doc_vecs]

    selected_indices: List[int] = []
    candidate_indices = list(range(n))

    while candidate_indices and len(selected_indices) < top_k:
        best_idx = None
        best_score = -1e9

        for idx in candidate_indices:
            if selected_indices:
                div = max(
                    _cosine_sim(doc_vecs[idx], doc_vecs[j])
                    for j in selected_indices
                )
            else:
                div = 0.0

            score = lambda_mult * relevance[idx] - (1.0 - lambda_mult) * div
            if score > best_score:
                best_score = score
                best_idx = idx

        selected_indices.append(best_idx)
        candidate_indices.remove(best_idx)

    mmr_docs: List[Doc] = []
    for idx in selected_indices:
        d = dict(docs[idx])  # shallow copy
        d["mmr_score"] = relevance[idx]
        mmr_docs.append(d)

    return mmr_docs
