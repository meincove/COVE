
from app.services.intent import looks_like_cart_add
from app.core.rules import get_regex_rules

print("Rules:", get_regex_rules().get("cart"))
print("Add to my cart:", looks_like_cart_add("Add to my cart"))
print("Checkout:", looks_like_cart_add("Checkout")) # Wait, does checkout use the same function?
