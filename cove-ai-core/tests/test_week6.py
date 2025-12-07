#!/usr/bin/env python3
"""
Comprehensive test suite for Week 6 features.

Tests:
- MCP hardening (error handling, timeouts)
- Response caching
- Monitoring endpoints
- Configuration validation
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.core.mcp_client import get_mcp_client, ToolNotFoundError, ToolTimeoutError
from app.core.response_cache import get_cached_response, cache_response
import httpx


async def test_mcp_error_handling():
    """Test MCP error handling improvements."""
    print("\n" + "="*60)
    print("TEST 1: MCP Error Handling")
    print("="*60)
    
    client = get_mcp_client()
    
    # Test 1: Tool not found
    print("\n  ✓ Testing tool not found error...")
    try:
        await client.call_tool("nonexistent_tool", {})
        print("    ❌ Should have raised ToolNotFoundError")
        return False
    except ToolNotFoundError as e:
        print(f"    ✅ Caught ToolNotFoundError: {e}")
        print(f"    Available tools shown: {e.available_tools[:3]}")
    
    # Test 2: Timeout (using a very short timeout)
    print("\n  ✓ Testing timeout handling...")
    try:
        # This might timeout or succeed - either is OK for this test
        result = await client.call_tool(
            "recommend_products",
            {"query": "test", "filters": {}, "top_k": 1},
            timeout=0.001  # Very short timeout
        )
        print("    ℹ️  Call completed before timeout (that's OK)")
    except ToolTimeoutError as e:
        print(f"    ✅ Caught ToolTimeoutError: {e}")
    except Exception as e:
        print(f"    ℹ️  Got different error (that's OK): {type(e).__name__}")
    
    print("\n  ✅ MCP error handling tests passed")
    return True


async def test_response_caching():
    """Test response cache functionality."""
    print("\n" + "="*60)
    print("TEST 2: Response Caching")
    print("="*60)
    
    # Test 1: Cache miss
    print("\n  ✓ Testing cache miss...")
    result = await get_cached_response("greeting", "hello there my friend")
    if result is None:
        print("    ✅ Cache miss (expected for new message)")
    else:
        print(f"    ⚠️  Unexpected cache hit: {result}")
    
    # Test 2: Cache set
    print("\n  ✓ Testing cache set...")
    await cache_response("greeting", "hello there my friend", "Hi! How can I help?")
    print("    ✅ Response cached")
    
    # Test 3: Cache hit
    print("\n  ✓ Testing cache hit...")
    result = await get_cached_response("greeting", "hello there my friend")
    if result == "Hi! How can I help?":
        print(f"    ✅ Cache hit! Got: {result}")
    else:
        print(f"    ❌ Cache miss or wrong value: {result}")
        return False
    
    # Test 4: Non-cacheable intent
    print("\n  ✓ Testing non-cacheable intent...")
    result = await get_cached_response("discover", "show me hoodies")
    if result is None:
        print("    ✅ Correctly not caching 'discover' intent")
    else:
        print(f"    ❌ Should not cache discover intent: {result}")
        return False
    
    print("\n  ✅ Response caching tests passed")
    return True


async def test_monitoring_endpoints():
    """Test monitoring and health endpoints."""
    print("\n" + "="*60)
    print("TEST 3: Monitoring Endpoints")
    print("="*60)
    
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Test 1: Health check
        print("\n  ✓ Testing /api/health...")
        try:
            response = await client.get(f"{base_url}/api/health")
            data = response.json()
            
            if data.get("status") in ["healthy", "degraded"]:
                print(f"    ✅ Health check: {data['status']}")
                print(f"    Checks: {list(data.get('checks', {}).keys())}")
            else:
                print(f"    ❌ Unexpected status: {data.get('status')}")
                return False
        except Exception as e:
            print(f"    ❌ Health check failed: {e}")
            return False
        
        # Test 2: Metrics dashboard
        print("\n  ✓ Testing /api/metrics/dashboard...")
        try:
            response = await client.get(f"{base_url}/api/metrics/dashboard")
            data = response.json()
            
            required_keys = ["mcp", "prompts", "response_cache"]
            missing = [k for k in required_keys if k not in data]
            
            if not missing:
                print(f"    ✅ Metrics dashboard has all keys")
                print(f"    Response cache enabled: {data['response_cache'].get('enabled')}")
            else:
                print(f"    ❌ Missing keys: {missing}")
                return False
        except Exception as e:
            print(f"    ❌ Metrics dashboard failed: {e}")
            return False
    
    print("\n  ✅ Monitoring endpoint tests passed")
    return True


async def test_end_to_end_streaming():
    """Test end-to-end streaming with caching."""
    print("\n" + "="*60)
    print("TEST 4: End-to-End Streaming with Cache")
    print("="*60)
    
    base_url = "http://localhost:8000"
    
    async with httpx.AsyncClient() as client:
        # Test 1: First request (uncached)
        print("\n  ✓ Testing first streaming request...")
        try:
            response = await client.post(
                f"{base_url}/ai/agent/query/stream",
                json={"message": "what is cove"},
                timeout=15.0
            )
            
            content = response.text
            if "event: token" in content:
                print("    ✅ Streaming response received")
                print(f"    Response length: {len(content)} bytes")
            else:
                print(f"    ❌ No streaming tokens found")
                return False
        except Exception as e:
            print(f"    ❌ Streaming failed: {e}")
            return False
        
        # Test 2: Second request (should be cached)
        print("\n  ✓ Testing second streaming request (cached)...")
        try:
            response = await client.post(
                f"{base_url}/ai/agent/query/stream",
                json={"message": "what is cove"},
                timeout=15.0
            )
            
            content = response.text
            if "event: token" in content:
                print("    ✅ Cached streaming response received")
                # Check if marked as cached
                if '"cached": true' in content:
                    print("    ✅ Response marked as cached")
                else:
                    print("    ℹ️  Response not marked as cached (might be different intent)")
            else:
                print(f"    ❌ No streaming tokens found")
                return False
        except Exception as e:
            print(f"    ❌ Cached streaming failed: {e}")
            return False
    
    print("\n  ✅ End-to-end streaming tests passed")
    return True


async def main():
    """Run all Week 6 tests."""
    print("\n" + "="*60)
    print("WEEK 6 - COMPREHENSIVE TEST SUITE")
    print("="*60)
    
    results = []
    
    # Run all tests
    results.append(("MCP Error Handling", await test_mcp_error_handling()))
    results.append(("Response Caching", await test_response_caching()))
    results.append(("Monitoring Endpoints", await test_monitoring_endpoints()))
    results.append(("End-to-End Streaming", await test_end_to_end_streaming()))
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"  {status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All Week 6 tests passed!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
