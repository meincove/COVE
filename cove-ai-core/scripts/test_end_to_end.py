"""
End-to-End System Test Script.
Tests the complete recommendation pipeline: Intent → Recommender → CF → Personalization.
Trains CF model, validates all integrations, measures performance.
"""

import asyncio
import json
import time
from pathlib import Path
import sys

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.mcp_agents.product_recommender.item_based_cf import get_item_cf
from app.mcp_agents.product_recommender.recommender import get_recommender
from app.mcp_agents.product_recommender.personalization import get_personalization_engine


class Colors:
    """Terminal colors for pretty output"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'


def print_header(text):
    """Print section header"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}\n")


def print_success(text):
    """Print success message"""
    print(f"{Colors.GREEN}✅ {text}{Colors.ENDC}")


def print_info(text):
    """Print info message"""
    print(f"{Colors.CYAN}ℹ️  {text}{Colors.ENDC}")


def print_warning(text):
    """Print warning message"""
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")


def print_error(text):
    """Print error message"""
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")


async def test_1_train_cf_model():
    """Test 1: Train CF model with synthetic data"""
    print_header("TEST 1: Train Collaborative Filtering Model")
    
    try:
        cf = get_item_cf()
        
        # Load synthetic interactions (check both locations)
        data_file = Path(__file__).parent.parent / "synthetic_interactions.json"
        if not data_file.exists():
            data_file = Path(__file__).parent / "synthetic_interactions.json"
        
        if not data_file.exists():
            print_error(f"Synthetic data not found. Looked in: {data_file}")
            return False
        
        with open(data_file) as f:
            interactions = json.load(f)
        
        print_info(f"Loaded {len(interactions)} interactions")
        
        # Build user-item matrix
        start = time.time()
        cf.build_user_item_matrix(interactions)
        build_time = time.time() - start
        print_success(f"Built user-item matrix in {build_time:.2f}s")
        
        # Compute similarities
        start = time.time()
        similarities = cf.compute_all_similarities()
        sim_time = time.time() - start
        print_success(f"Computed similarities in {sim_time:.2f}s")
        
        # Validate
        if not similarities:
            print_error("No similarities computed!")
            return False
        
        print_info(f"Computed similarities for {len(similarities)} items")
        
        # Test a sample
        sample_item = list(similarities.keys())[0]
        similar_items = cf.get_similar_items(sample_item, top_k=5)
        
        print_info(f"Sample: Items similar to {sample_item}:")
        for item_id, score in similar_items[:3]:
            print(f"   - {item_id}: {score:.4f}")
        
        print_success("CF model trained successfully!")
        return True
        
    except Exception as e:
        print_error(f"CF training failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_2_recommender_basic():
    """Test 2: Basic recommender functionality"""
    print_header("TEST 2: Basic Recommender Functionality")
    
    try:
        recommender = get_recommender()
        
        # Test query without user_id
        print_info("Testing query: 'casual hoodie' (no user)")
        
        start = time.time()
        results = await recommender.recommend(
            query="casual hoodie",
            top_k=5
        )
        latency = (time.time() - start) * 1000  # ms
        
        print_success(f"Got {len(results)} results in {latency:.2f}ms")
        
        if results:
            print_info("Top 3 results:")
            for i, product in enumerate(results[:3], 1):
                print(f"   {i}. {product.title} - €{product.price} (score: {product.score:.4f})")
        
        # Check latency
        if latency > 200:
            print_warning(f"Latency high: {latency:.2f}ms (target: <200ms)")
        else:
            print_success(f"Latency good: {latency:.2f}ms")
        
        return len(results) > 0
        
    except Exception as e:
        print_error(f"Recommender test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_3_recommender_with_cf():
    """Test 3: Recommender with CF (cold start)"""
    print_header("TEST 3: Recommender with CF (Cold Start)")
    
    try:
        recommender = get_recommender()
        
        # Test with user_id but no history (cold start)
        print_info("Testing query: 'designer bomber' (user_id='test_user_123')")
        
        start = time.time()
        results = await recommender.recommend(
            query="designer bomber",
            user_id="test_user_123",
            top_k=5
        )
        latency = (time.time() - start) * 1000
        
        print_success(f"Got {len(results)} results in {latency:.2f}ms")
        
        if results:
            print_info("Cold start handled - fallback to vector similarity")
            for i, product in enumerate(results[:3], 1):
                print(f"   {i}. {product.title} - €{product.price}")
        
        return len(results) > 0
        
    except Exception as e:
        print_error(f"CF test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_4_personalization():
    """Test 4: Personalization engine"""
    print_header("TEST 4: Personalization Engine")
    
    try:
        personalization = get_personalization_engine()
        
        # Create mock user profile
        from app.mcp_agents.product_recommender.personalization import UserProfile, UserInteraction
        from datetime import datetime, timedelta
        
        profile = UserProfile(
            user_id="test_user",
            interactions=[
                UserInteraction(
                    product_id="CCH001",
                    interaction_type="purchase",
                    timestamp=datetime.now() - timedelta(days=1),
                    weight=1.0
                ),
                UserInteraction(
                    product_id="CCT007",
                    interaction_type="view",
                    timestamp=datetime.now() - timedelta(hours=2),
                    weight=0.3
                )
            ],
            preferences={"type": {"hoodie": 0.8, "tee": 0.4}}
        )
        
        # Mock results
        mock_results = [
            {"id": "CCH001", "title": "Hoodie 1", "type": "hoodie", "price": 19.99, "rrf_score": 0.8},
            {"id": "CCT007", "title": "Tee 1", "type": "tee", "price": 14.99, "rrf_score": 0.7},
            {"id": "CCB013", "title": "Bomber 1", "type": "bomber", "price": 39.99, "rrf_score": 0.6},
        ]
        
        # Apply personalization
        personalized = personalization.personalize_results(mock_results, profile)
        
        print_success("Personalization applied")
        print_info("Personalized scores:")
        for result in personalized[:3]:
            print(f"   - {result['title']}: {result.get('final_score', 0):.4f}")
        
        return True
        
    except Exception as e:
        print_error(f"Personalization test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_5_filters():
    """Test 5: Recommendations with filters"""
    print_header("TEST 5: Filtered Recommendations")
    
    try:
        recommender = get_recommender()
        
        # Test with filters
        print_info("Testing: bomber jackets under €100")
        
        results = await recommender.recommend(
            query="jacket",
            filters={"type": "bomber", "price_max": 100.0},
            top_k=5
        )
        
        print_success(f"Got {len(results)} filtered results")
        
        # Validate filters
        all_valid = True
        for product in results:
            if product.type and product.type != "bomber":
                print_error(f"Filter failed: {product.title} is {product.type}, not bomber")
                all_valid = False
            if product.price and product.price > 100.0:
                print_error(f"Filter failed: {product.title} costs €{product.price} > €100")
                all_valid = False
        
        if all_valid:
            print_success("All filters correctly applied")
        
        return all_valid
        
    except Exception as e:
        print_error(f"Filter test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_6_performance():
    """Test 6: Performance benchmarks"""
    print_header("TEST 6: Performance Benchmarks")
    
    try:
        recommender = get_recommender()
        
        queries = [
            "casual hoodie",
            "designer tee",
            "bomber jacket",
            "limited edition",
            "black hoodie"
        ]
        
        latencies = []
        
        for query in queries:
            start = time.time()
            results = await recommender.recommend(query, top_k=10)
            latency = (time.time() - start) * 1000
            latencies.append(latency)
        
        avg = sum(latencies) / len(latencies)
        min_lat = min(latencies)
        max_lat = max(latencies)
        
        print_info(f"Queries tested: {len(queries)}")
        print_info(f"Average latency: {avg:.2f}ms")
        print_info(f"Min latency: {min_lat:.2f}ms")
        print_info(f"Max latency: {max_lat:.2f}ms")
        
        if avg < 100:
            print_success(f"Performance excellent: {avg:.2f}ms < 100ms")
        elif avg < 200:
            print_success(f"Performance good: {avg:.2f}ms < 200ms")
        else:
            print_warning(f"Performance needs improvement: {avg:.2f}ms > 200ms")
        
        return avg < 200
        
    except Exception as e:
        print_error(f"Performance test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_7_consistency():
    """Test 7: Recommendation consistency"""
    print_header("TEST 7: Recommendation Consistency")
    
    try:
        recommender = get_recommender()
        
        # Run same query multiple times
        query = "hoodie"
        runs = 3
        
        all_results = []
        
        for i in range(runs):
            results = await recommender.recommend(query, top_k=5)
            all_results.append([p.id for p in results])
        
        # Calculate overlap
        set1, set2, set3 = [set(r) for r in all_results]
        
        overlap_12 = len(set1 & set2) / max(len(set1), len(set2), 1)
        overlap_23 = len(set2 & set3) / max(len(set2), len(set3), 1)
        overlap_all = len(set1 & set2 & set3) / max(len(set1), 1)
        
        avg_overlap = (overlap_12 + overlap_23) / 2
        
        print_info(f"Overlap run 1-2: {overlap_12*100:.1f}%")
        print_info(f"Overlap run 2-3: {overlap_23*100:.1f}%")
        print_info(f"Common to all: {overlap_all*100:.1f}%")
        
        if avg_overlap >= 0.8:
            print_success(f"Consistency excellent: {avg_overlap*100:.1f}%")
        elif avg_overlap >= 0.6:
            print_success(f"Consistency good: {avg_overlap*100:.1f}%")
        else:
            print_warning(f"Consistency could be better: {avg_overlap*100:.1f}%")
        
        return avg_overlap >= 0.6
        
    except Exception as e:
        print_error(f"Consistency test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def main():
    """Run all end-to-end tests"""
    print_header("🚀 END-TO-END SYSTEM TEST 🚀")
    
    tests = [
        ("Train CF Model", test_1_train_cf_model),
        ("Basic Recommender", test_2_recommender_basic),
        ("CF with Cold Start", test_3_recommender_with_cf),
        ("Personalization", test_4_personalization),
        ("Filtered Recommendations", test_5_filters),
        ("Performance Benchmarks", test_6_performance),
        ("Recommendation Consistency", test_7_consistency),
    ]
    
    results = {}
    
    for name, test_func in tests:
        try:
            success = await test_func()
            results[name] = success
        except Exception as e:
            print_error(f"Test '{name}' crashed: {e}")
            results[name] = False
    
    # Summary
    print_header("📊 TEST SUMMARY")
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, success in results.items():
        status = f"{Colors.GREEN}PASS{Colors.ENDC}" if success else f"{Colors.FAIL}FAIL{Colors.ENDC}"
        print(f"  {status} | {name}")
    
    print(f"\n{Colors.BOLD}Results: {passed}/{total} tests passed{Colors.ENDC}")
    
    if passed == total:
        print_success("🎉 ALL TESTS PASSED! System is fully operational!")
    elif passed >= total * 0.8:
        print_warning(f"⚠️  Most tests passed ({passed}/{total}). Review failures.")
    else:
        print_error(f"❌ Many tests failed ({total-passed}/{total}). System needs fixes.")
    
    return passed == total


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
