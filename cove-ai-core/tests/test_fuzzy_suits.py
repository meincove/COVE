
from app.core.fuzzy import apply_fuzzy_matching

queries = [
    "show me 3 piece suits",
    "looking for suits",
    "blue suit"
]

print("--- FUZZY MATCHING TEST ---")
for q in queries:
    processed = apply_fuzzy_matching(q)
    print(f"Original: '{q}' -> Processed: '{processed}'")
print("---------------------------")
