import unittest
from app.agents.stylist_agent import StylistAgent

class TestCategoryEnforcement(unittest.TestCase):
    def setUp(self):
        self.agent = StylistAgent("stylist")

    def test_tops_rejection(self):
        # High-tops should be rejected from Tops (both via meta AND config-driven type mapping)
        self.assertFalse(self.agent._validate_category_relevance("tops", {"title": "Vortex High-tops", "meta": {"outfit_category": "shoes"}}))
        self.assertFalse(self.agent._validate_category_relevance("tops", {"title": "Legacy High-tops", "type": "high-tops"}))
        self.assertFalse(self.agent._validate_category_relevance("tops", {"title": "Aura sneakers", "type": "sneakers"}))
        # Confusing name: "Top-Rated Shoe" should be rejected from Tops if type is sneakers
        self.assertFalse(self.agent._validate_category_relevance("tops", {"title": "Top-Rated Shoe", "type": "sneakers"}))
        
        # Hoodies should be accepted in Tops
        self.assertTrue(self.agent._validate_category_relevance("tops", {"title": "Vortex Hoodie", "type": "hoodie"}))

    def test_bottoms_rejection(self):
        # High-tops and shirts should be rejected from Bottoms
        self.assertFalse(self.agent._validate_category_relevance("bottoms", {"title": "Vortex High-tops", "type": "high-tops"}))
        self.assertFalse(self.agent._validate_category_relevance("bottoms", {"title": "Aura Shirt", "type": "shirt"}))
        # Confusing name: "Long Top Pant" should be accepted in Bottoms if type is pants
        self.assertTrue(self.agent._validate_category_relevance("bottoms", {"title": "Long Top Pant", "type": "pants"}))

    def test_shoes_relevance(self):
        # High-tops should be accepted in Shoes even if title contains "top"
        self.assertTrue(self.agent._validate_category_relevance("shoes", {"title": "Vortex High-tops", "type": "high-tops"}))
        # Confusing name: "Top-Tier Sneakers" should be accepted in Shoes
        self.assertTrue(self.agent._validate_category_relevance("shoes", {"title": "Top-Tier Sneakers", "type": "sneakers"}))

    def test_accessories_rejection(self):
        # Shoes and clothes should be rejected from Accessories (if they have mappings)
        self.assertFalse(self.agent._validate_category_relevance("accessories", {"title": "High-tops", "type": "high-tops"}))
        self.assertFalse(self.agent._validate_category_relevance("accessories", {"title": "Hoodie", "type": "hoodie"}))

if __name__ == "__main__":
    unittest.main()
