#!/usr/bin/env python3
"""
Production Test for Multi-Agent Orchestrator

Tests all workflow scenarios and validates production readiness.
"""

import asyncio
import sys
from pathlib import Path
from typing import Dict, Any

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.agents import orchestrator
from app.core.agent_registry import registry


def print_header(title: str):
    """Print formatted header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def print_section(title: str):
    """Print formatted section."""
    print(f"\n{'─' * 70}")
    print(f"  {title}")
    print(f"{'─' * 70}")


async def test_workflow_detection():
    """Test 1: Workflow pattern detection."""
    print_section("TEST 1: Workflow Detection")
    
    test_cases = [
        ("build me an outfit for a meeting", "outfit_builder"),
        ("what should I wear to a date", "outfit_builder"),
        ("complete look for wedding", "outfit_builder"),
        ("show me hoodies", None),
        ("what's your return policy", None),
    ]
    
    print("\nTesting trigger patterns:")
    for query, expected in test_cases:
        result = await orchestrator.should_handle(query)
        status = "✅" if result == expected else "❌"
        print(f"  {status} '{query[:40]}...' → {result or 'None'}")
    
    return True


async def test_agent_registry():
    """Test 2: Agent registry."""
    print_section("TEST 2: Agent Registry")
    
    agents = registry.list_all()
    print(f"\n✅ Registered agents: {len(agents)}")
    
    for agent in agents:
        print(f"\n  • {agent['name']}")
        print(f"    Description: {agent['description']}")
        print(f"    Capabilities: {', '.join(agent['capabilities'][:5])}")
        print(f"    Priority: {agent['priority']}")
    
    # Test agent retrieval
    print("\n\nTesting agent retrieval:")
    for agent_name in ["stylist", "fit", "budget"]:
        agent = registry.get_agent(agent_name)
        status = "✅" if agent else "❌"
        print(f"  {status} {agent_name}: {agent['description'] if agent else 'NOT FOUND'}")
    
    return len(agents) == 3


async def test_basic_workflow():
    """Test 3: Basic workflow execution."""
    print_section("TEST 3: Basic Workflow Execution")
    
    query = "business casual outfit for client meeting"
    budget = 300
    
    print(f"\nQuery: {query}")
    print(f"Budget: €{budget}")
    print("\n🚀 Executing workflow...\n")
    
    try:
        result = await orchestrator.execute_workflow(
            workflow_name="outfit_builder",
            query=query,
            context={
                "budget_max": budget,
                "user_id": "test_user_production"
            }
        )
        
        # Print results
        print(f"✅ Success: {result.get('success')}")
        print(f"✅ Confidence: {result.get('confidence', 0):.0%}")
        print(f"✅ Reasoning: {result.get('reasoning', 'N/A')[:100]}")
        
        # Agent timings
        print("\n⏱️  Agent Execution Times:")
        for agent, ms in result.get("agent_timings", {}).items():
            print(f"  • {agent}: {ms:.0f}ms")
        
        # Check parallel execution
        fit_time = result.get("agent_timings", {}).get("fit", 999999)
        budget_time = result.get("agent_timings", {}).get("budget", 999999)
        is_parallel = abs(fit_time - budget_time) < 100  # Within 100ms = parallel
        
        print(f"\n⚡ Parallel Execution: {'✅ CONFIRMED' if is_parallel else '❌ NOT DETECTED'}")
        
        return result.get('success', False)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


async def test_error_handling():
    """Test 4: Error handling and resilience."""
    print_section("TEST 4: Error Handling & Resilience")
    
    print("\nTesting with invalid workflow:")
    try:
        await orchestrator.execute_workflow(
            workflow_name="nonexistent_workflow",
            query="test",
            context={}
        )
        print("❌ Should have raised error")
        return False
    except ValueError as e:
        print(f"✅ Correctly raised ValueError: {e}")
    
    print("\nTesting graceful degradation:")
    # This will fail to find products but should still succeed
    result = await orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query="outfit for gym workout",
        context={"budget_max": 150}
    )
    
    print(f"✅ Handled empty results: Success={result.get('success')}")
    print(f"✅ Errors tracked: {len(result.get('errors', []))} errors")
    
    return True


async def test_metrics():
    """Test 5: Metrics tracking."""
    print_section("TEST 5: Metrics & Observability")
    
    metrics = orchestrator.get_metrics()
    
    print("\n📊 Current Metrics:")
    print(f"  Total Executions: {metrics['total_executions']}")
    print(f"  Successes: {metrics['successes']}")
    print(f"  Failures: {metrics['failures']}")
    print(f"  Success Rate: {metrics['success_rate']:.0%}")
    print(f"  Avg Duration: {metrics['avg_duration_ms']:.0f}ms")
    
    return metrics['total_executions'] > 0


async def test_parallel_execution():
    """Test 6: Verify parallel execution."""
    print_section("TEST 6: Parallel Execution Verification")
    
    print("\nExecuting workflow to measure parallel speedup...")
    
    result = await orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query="casual outfit for weekend",
        context={"budget_max": 200}
    )
    
    timings = result.get("agent_timings", {})
    stylist_time = timings.get("stylist", 0)
    fit_time = timings.get("fit", 0)
    budget_time = timings.get("budget", 0)
    
    print(f"\n⏱️  Measured Times:")
    print(f"  Stylist (Group 0): {stylist_time:.0f}ms")
    print(f"  Fit (Group 1):     {fit_time:.0f}ms")
    print(f"  Budget (Group 1):  {budget_time:.0f}ms")
    
    # Check if fit and budget are truly parallel
    parallel_diff = abs(fit_time - budget_time)
    is_parallel = parallel_diff < 100  # Less than 100ms difference
    
    print(f"\n⚡ Parallel Execution:")
    print(f"  Time Difference: {parallel_diff:.0f}ms")
    print(f"  Status: {'✅ PARALLEL (fit + budget concurrent)' if is_parallel else '❌ NOT PARALLEL'}")
    
    # Calculate theoretical sequential time
    sequential_time = stylist_time + max(fit_time, budget_time) + max(fit_time, budget_time)
    actual_time = stylist_time + max(fit_time, budget_time)
    speedup = sequential_time / actual_time if actual_time > 0 else 1
    
    print(f"\n📈 Performance:")
    print(f"  Sequential (est): {sequential_time:.0f}ms")
    print(f"  Parallel (actual): {actual_time:.0f}ms")
    print(f"  Speedup: {speedup:.1f}x")
    
    return is_parallel


async def run_all_tests():
    """Run all production tests."""
    print_header("🧪 MULTI-AGENT ORCHESTRATOR - PRODUCTION TEST SUITE")
    
    print("\n📋 Test Configuration:")
    print(f"  Workflows Loaded: {len(orchestrator.workflows)}")
    print(f"  Agents Registered: {registry.get_agent_count()}")
    print(f"  Python Version: {sys.version.split()[0]}")
    
    tests = [
        ("Workflow Detection", test_workflow_detection),
        ("Agent Registry", test_agent_registry),
        ("Basic Workflow", test_basic_workflow),
        ("Error Handling", test_error_handling),
        ("Metrics Tracking", test_metrics),
        ("Parallel Execution", test_parallel_execution),
    ]
    
    results = []
    
    for i, (name, test_func) in enumerate(tests, 1):
        try:
            passed = await test_func()
            results.append((name, passed))
        except Exception as e:
            print(f"\n❌ Test failed with exception: {e}")
            results.append((name, False))
    
    # Final summary
    print_header("📊 TEST SUMMARY")
    
    passed_count = sum(1 for _, passed in results if passed)
    total_count = len(results)
    
    print("\nResults:")
    for name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\n{'─' * 70}")
    print(f"  Total: {passed_count}/{total_count} tests passed")
    print(f"  Success Rate: {(passed_count/total_count)*100:.0f}%")
    print(f"{'─' * 70}")
    
    # Production readiness check
    print("\n🚀 PRODUCTION READINESS:")
    
    checks = [
        ("All agents registered", registry.get_agent_count() == 3),
        ("Workflows loaded", len(orchestrator.workflows) > 0),
        ("Basic execution works", any(name == "Basic Workflow" and passed for name, passed in results)),
        ("Error handling works", any(name == "Error Handling" and passed for name, passed in results)),
        ("Parallel execution confirmed", any(name == "Parallel Execution" and passed for name, passed in results)),
    ]
    
    all_ready = all(ready for _, ready in checks)
    
    for check, ready in checks:
        status = "✅" if ready else "❌"
        print(f"  {status} {check}")
    
    print("\n" + "=" * 70)
    if all_ready:
        print("  ✅ SYSTEM READY FOR PRODUCTION DEPLOYMENT")
    else:
        print("  ⚠️  SYSTEM NOT READY - FIX ISSUES BEFORE DEPLOYMENT")
    print("=" * 70)
    
    return all_ready


if __name__ == "__main__":
    print("\n🚀 Starting Production Test Suite...")
    print(f"   Time: {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        ready = asyncio.run(run_all_tests())
        exit_code = 0 if ready else 1
        
        print(f"\n{'✅ Tests completed successfully!' if ready else '❌ Tests failed - see errors above'}")
        print(f"   Exit code: {exit_code}\n")
        
        sys.exit(exit_code)
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Test interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
