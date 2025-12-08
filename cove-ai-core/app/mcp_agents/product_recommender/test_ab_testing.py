"""
Tests for A/B Testing Framework.
Validates variant assignment, event tracking, and CF toggling.
"""

import pytest
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.mcp_agents.product_recommender.ab_testing import ABTestManager, Variant, get_ab_manager


def test_ab_manager_initialization():
    """Test A/B manager initializes correctly"""
    ab_manager = get_ab_manager()
    
    assert ab_manager is not None
    assert "cf_vs_baseline" in ab_manager.experiments
    assert ab_manager.experiments["cf_vs_baseline"]["enabled"]
    
    print("\n✅ A/B manager initialized with cf_vs_baseline experiment")


def test_variant_assignment_consistency():
    """Test same user gets same variant"""
    ab_manager = get_ab_manager()
    
    user_id = "test_user_12345"
    
    # Assign variant multiple times
    variants = [ab_manager.assign_variant(user_id) for _ in range(10)]
    
    # Should all be the same
    assert len(set(variants)) == 1, "User should get consistent variant"
    
    print(f"\n✅ Consistent assignment: user {user_id} → {variants[0]}")


def test_variant_distribution():
    """Test variants are distributed according to weights"""
    ab_manager = get_ab_manager()
    
    # Assign many users
    n_users = 1000
    assignments = {}
    
    for i in range(n_users):
        user_id = f"user_{i}"
        variant = ab_manager.assign_variant(user_id)
        assignments[variant] = assignments.get(variant, 0) + 1
    
    # Check distribution (should be ~50/50 with 0.5 weights)
    control_pct = assignments.get(Variant.CONTROL, 0) / n_users
    treatment_pct = assignments.get(Variant.TREATMENT, 0) / n_users
    
    print(f"\n✅ Distribution ({n_users} users):")
    print(f"   Control: {control_pct*100:.1f}%")
    print(f"   Treatment: {treatment_pct*100:.1f}%")
    
    # Allow 10% deviation from expected 50/50
    assert abs(control_pct - 0.5) < 0.1, f"Control should be ~50%, got {control_pct*100:.1f}%"
    assert abs(treatment_pct - 0.5) < 0.1, f"Treatment should be ~50%, got {treatment_pct*100:.1f}%"


def test_variant_config():
    """Test variant configs are correct"""
    ab_manager = get_ab_manager()
    
    control_config = ab_manager.get_variant_config(Variant.CONTROL)
    treatment_config = ab_manager.get_variant_config(Variant.TREATMENT)
    
    print("\n✅ Variant configs:")
    print(f"   Control: CF={control_config.get('cf_enabled')}")
    print(f"   Treatment: CF={treatment_config.get('cf_enabled')}")
    
    assert control_config["cf_enabled"] == False
    assert treatment_config["cf_enabled"] == True


def test_should_use_cf():
    """Test CF enablement decision"""
    ab_manager = get_ab_manager()
    
    # Control group user
    control_user = "control_test_user"
    # Force assignment by checking first
    variant = ab_manager.assign_variant(control_user)
    should_use_cf = ab_manager.should_use_cf(control_user)
    
    print(f"\n✅ CF decision test:")
    print(f"   User: {control_user}")
    print(f"   Variant: {variant}")
    print(f"   Use CF: {should_use_cf}")
    
    # Should match variant config
    expected = ab_manager.get_variant_config(variant)["cf_enabled"]
    assert should_use_cf == expected


def test_event_tracking():
    """Test event tracking (logs for now)"""
    ab_manager = get_ab_manager()
    
    # Track a recommendation shown event
    ab_manager.track_event(
        "recommendation_shown",
        {
            "variant": "treatment",
            "user_id": "test_user_789",
            "query": "casual hoodie",
            "results_count": 5
        }
    )
    
    # Track a click event
    ab_manager.track_event(
        "recommendation_clicked",
        {
            "variant": "treatment",
            "user_id": "test_user_789",
            "product_id": "CCH001",
            "position": 1
        }
    )
    
    print("\n✅ Events tracked successfully (check logs)")


def test_experiment_stats():
    """Test getting experiment statistics"""
    ab_manager = get_ab_manager()
    
    stats = ab_manager.get_experiment_stats()
    
    assert "experiment" in stats
    assert "variants" in stats
    assert "significance" in stats
    
    print("\n✅ Experiment stats:")
    print(f"   Status: {stats['status']}")
    print(f"   Variants: {list(stats['variants'].keys())}")


@pytest.mark.asyncio
async def test_recommender_ab_integration():
    """Test recommender respects A/B testing"""
    from app.mcp_agents.product_recommender.recommender import get_recommender
    
    recommender = get_recommender()
    
    # Enable A/B testing
    recommender.ab_testing_enabled = True
    
    # Test with different users
    user_a = "ab_test_user_a"
    user_b = "ab_test_user_b"
    
    cf_a = recommender._should_enable_cf_for_user(user_a)
    cf_b = recommender._should_enable_cf_for_user(user_b)
    
    print(f"\n✅ Recommender A/B integration:")
    print(f"   User A: CF enabled = {cf_a}")
    print(f"   User B: CF enabled = {cf_b}")
    
    # At least one should be different (statistically)
    # But with only 2 users, might be same, so just check it works
    assert isinstance(cf_a, bool)
    assert isinstance(cf_b, bool)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
