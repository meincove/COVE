"""
Test thinking tracker and tool tracker in isolation.
Ensures modules work correctly before integration.
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.thinking_tracker import ThinkingTracker, ThinkingEvent
from app.core.tool_tracker import ToolTracker, ToolUsage
import time
import json


def test_thinking_tracker():
    """Test thinking tracker basic functionality"""
    print("\n" + "="*60)
    print("Testing ThinkingTracker")
    print("="*60)
    
    tracker = ThinkingTracker()
    
    # Should be disabled by default
    assert tracker.is_enabled() == False, "❌ Tracker should be disabled by default"
    print("✅ Tracker disabled by default (feature flag working)")
    
    # Enable it temporarily for testing
    tracker.config['enabled'] = True
    
    # Test adding events
    event1 = tracker.add_thinking("search", "Searching catalog...")
    assert event1 != "", "❌ Failed to create event"
    print(f"✅ Created thinking event: {event1}")
    
    time.sleep(0.1)  # Simulate work
    
    # Complete the event
    tracker.complete(event1, details="Found 247 items", tool_used="hybrid_search")
    print("✅ Completed thinking event")
    
    # Add another event
    event2 = tracker.add_thinking("stylist", "Analyzing style preferences...")
    tracker.complete(event2, details="Selected minimalist aesthetic", confidence=85.5)
    print("✅ Added second event with confidence score")
    
    # Get all events
    events = tracker.get_all_events()
    assert len(events) == 2, f"❌ Expected 2 events, got {len(events)}"
    print(f"✅ Retrieved {len(events)} events")
    
    # Check event structure
    event_data = events[0]
    assert "agent" in event_data, "❌ Missing 'agent' field"
    assert "action" in event_data, "❌ Missing 'action' field"
    assert "status" in event_data, "❌ Missing 'status' field"
    assert event_data["status"] == "done", "❌ Status should be 'done'"
    print("✅ Event structure correct")
    
    # Test summary
    summary = tracker.get_summary()
    assert summary["total_events"] == 2, "❌ Wrong total events"
    assert summary["completed"] == 2, "❌ Wrong completed count"
    assert summary["errors"] == 0, "❌ Wrong error count"
    print(f"✅ Summary: {summary}")
    
    # Test error handling
    event3 = tracker.add_thinking("budget", "Optimizing price...")
    tracker.error(event3, "API timeout")
    events = tracker.get_all_events()
    assert events[-1]["status"] == "error", "❌ Error status not set"
    print("✅ Error handling works")
    
    # Test clear
    tracker.clear()
    assert len(tracker.get_all_events()) == 0, "❌ Clear didn't work"
    print("✅ Clear functionality works")
    
    print("\n✅ ThinkingTracker: ALL TESTS PASSED\n")


def test_tool_tracker():
    """Test tool tracker basic functionality"""
    print("\n" + "="*60)
    print("Testing ToolTracker")
    print("="*60)
    
    tracker = ToolTracker()
    
    # Test successful tool usage
    usage1 = tracker.start("hybrid_search", inputs={"query": "hoodies", "top_k": 10})
    time.sleep(0.05)  # Simulate tool execution
    tracker.complete(usage1, outputs={"results": ["item1", "item2", "item3"]})
    
    assert usage1.duration_ms > 0, "❌ Duration should be > 0"
    assert usage1.success == True, "❌ Should be successful"
    print(f"✅ Tool completed: {usage1.summary} ({usage1.duration_ms}ms)")
    
    # Test failed tool usage
    usage2 = tracker.start("size_recommend")
    time.sleep(0.02)
    tracker.error(usage2, "Invalid product ID")
    
    assert usage2.success == False, "❌ Should be failed"
    assert usage2.error is not None, "❌ Error should be set"
    print(f"✅ Tool error handled: {usage2.summary}")
    
    # Test summary
    summary = tracker.get_summary()
    assert len(summary) == 2, f"❌ Expected 2 tools, got {len(summary)}"
    print(f"✅ Summary: {len(summary)} tools tracked")
    
    # Test stats
    stats = tracker.get_stats()
    assert stats["total_tools"] == 2, "❌ Wrong total tools"
    assert stats["successful"] == 1, "❌ Wrong successful count"
    assert stats["failed"] == 1, "❌ Wrong failed count"
    assert stats["total_duration_ms"] > 0, "❌ Total duration should be > 0"
    print(f"✅ Stats: {stats}")
    
    # Test clear
    tracker.clear()
    assert len(tracker.get_summary()) == 0, "❌ Clear didn't work"
    print("✅ Clear functionality works")
    
    print("\n✅ ToolTracker: ALL TESTS PASSED\n")


def test_integration():
    """Test using both trackers together"""
    print("\n" + "="*60)
    print("Testing Integration (ThinkingTracker + ToolTracker)")
    print("="*60)
    
    thinking = ThinkingTracker()
    tools = ToolTracker()
    
    # Enable thinking
    thinking.config['enabled'] = True
    
    # Simulate a query workflow
    print("\nSimulating: 'Show me hoodies'")
    
    # Step 1: Intent classification
    event1 = thinking.add_thinking("classifier", "Understanding request...")
    time.sleep(0.02)
    thinking.complete(event1, details="Intent: product_discovery")
    print("  ✅ Step 1: Intent classified")
    
    # Step 2: Search with tool tracking
    event2 = thinking.add_thinking("search", "Searching catalog...")
    tool1 = tools.start("hybrid_search", inputs={"query": "hoodies"})
    time.sleep(0.05)  # Simulate search
    tools.complete(tool1, outputs={"results": [f"item{i}" for i in range(24)]})
    thinking.complete(event2, details="Found 24 items", tool_used=tool1.summary)
    print(f"  ✅ Step 2: Search completed ({tool1.duration_ms}ms)")
    
    # Step 3: Style analysis
    event3 = thinking.add_thinking("stylist", "Analyzing style preferences...")
    time.sleep(0.03)
    thinking.complete(event3, details="Minimalist aesthetic detected", confidence=87.5)
    print("  ✅ Step 3: Style analyzed")
    
    # Get combined results
    print("\nCombined Results:")
    print(f"  Thinking events: {len(thinking.get_all_events())}")
    print(f"  Tools used: {len(tools.get_summary())}")
    print(f"  Total time: {tools.get_total_time()}ms")
    
    thinking_json = json.dumps(thinking.get_all_events(), indent=2)
    tools_json = json.dumps(tools.get_summary(), indent=2)
    
    print("\nThinking Events JSON:")
    print(thinking_json[:200] + "..." if len(thinking_json) > 200 else thinking_json)
    
    print("\nTools Used JSON:")
    print(tools_json)
    
    print("\n✅ Integration: ALL TESTS PASSED\n")


if __name__ == "__main__":
    print("\n" + "="*60)
    print("STANDALONE MODULE TESTS")
    print("Testing thinking_tracker.py and tool_tracker.py")
    print("="*60)
    
    try:
        test_thinking_tracker()
        test_tool_tracker()
        test_integration()
        
        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED!")
        print("="*60)
        print("\nModules are ready for integration into agent.py")
        print("Next step: Add optional thinking events to /ai/agent/query")
        print("\n")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}\n")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n")
        import traceback
        traceback.print_exc()
        sys.exit(1)
