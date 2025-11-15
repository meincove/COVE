# python - <<'PY'
# import json, os, httpx
# from app.vector.store import connect, upsert_doc
# from app.core.config import OPENAI_API_KEY, EMBED_MODEL
# from pathlib import Path

# def emb(txts):
#     import httpx
#     r = httpx.post("https://api.openai.com/v1/embeddings",
#       headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
#       json={"model": EMBED_MODEL, "input": txts}, timeout=60)
#     r.raise_for_status(); return [d["embedding"] for d in r.json()["data"]]

# conn = connect()
# root = Path(__file__).resolve().parents[1] / "data"
# meta = json.load(open(root/"clothingMeta.json"))
# cat  = json.load(open(root/"catalogData.json"))

# docs=[]
# for g in cat.values():
#   for p in g:
#     title = p["name"]
#     text  = (p.get("description") or "") + "\nTIER:" + p["tier"] + "\nTYPE:" + p["type"]
#     docs.append(("product", title, text[:3000], f"/product/{p['slug']}", {"text": text[:3000]}))

# # simple chunks
# for i in range(0,len(docs),32):
#   chunk=docs[i:i+32]
#   vecs=emb([d[2] for d in chunk])
#   for (kind,title,text,url,meta),v in zip(chunk,vecs):
#     upsert_doc(conn, kind, title, text, url, meta, v)
# print("Ingested", len(docs))
# PY
