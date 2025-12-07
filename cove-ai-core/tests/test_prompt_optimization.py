#!/usr/bin/env python3
"""
Test script for prompt optimization (Phase 3).

Compares token usage between default prompts and optimized templates.
"""
import asyncio
import sys
from pathlib import Path

# Add cove-ai-core to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.prompt_builder import (
    build_messages_for_intent,
    get_optimization_stats,
    get_template_for_intent
)
from app.core.rules import get_prompt


def count_tokens_rough(text: str) -> int:
    """Rough token estimate using word count * 1.3."""
    return int(len(text.split()) * 1.3)


def test_intent(intent: str, message: str):
    """Test a single intent and compare token usage."""
    print(f"\n{'='*60}")
    print(f"Intent: {intent}")
    print(f"Message: '{message}'")
    print(f"{'='*60}")
    
    # Get optimized template
    optimized_msgs, meta = build_messages_for_intent(intent, message)
    optimized_system = optimized_msgs[0]["content"]
    optimized_tokens = count_tokens_rough(optimized_system)
    
    # Get default template for comparison
    default_prompt = get_prompt("agent_chat", default="")
    default_tokens = count_tokens_rough(default_prompt)
    
    # Calculate savings
    savings = default_tokens - optimized_tokens
    savings_pct = (savings / default_tokens * 100) if default_tokens > 0 else 0
    
    print(f"\n📝 Template: {meta['template']}")
    print(f"   Description: {meta['description']}")
    print(f"   Max tokens: {meta['max_tokens']}")
    print(f"   Temperature: {meta['temperature']}")
    
    print(f"\n🔢 Token Comparison:")
    print(f"   Default prompt:    ~{default_tokens} tokens")
    print(f"   Optimized prompt:  ~{optimized_tokens} tokens")
    print(f"   Savings:           ~{savings} tokens ({savings_pct:.1f}% reduction)")
    
    print(f"\n💬 Optimized System Prompt:")
    print(f"   {optimized_system[:200]}...")
    
    return {
        "intent": intent,
        "message": message,
        "default_tokens": default_tokens,
        "optimized_tokens": optimized_tokens,
        "savings": savings,
        "savings_pct": savings_pct
    }


def main():
    """Run prompt optimization tests."""
    print("\n" + "="*60)
    print("WEEK 5 PHASE 3 - PROMPT OPTIMIZATION TEST")
    print("="*60)
    
    # Get overall stats
    stats = get_optimization_stats()
    print(f"\n📊 Optimization Stats:")
    print(f"   Enabled: {stats['enabled']}")
    print(f"   Total templates: {stats['total_templates']}")
    print(f"   Intents covered: {', '.join(stats['intents_covered'])}")
    print(f"   Default tokens: ~{stats['default_tokens_estimate']}")
    print(f"   Optimized avg: ~{stats['optimized_tokens_avg']}")
    print(f"   Estimated reduction: {stats['estimated_reduction']*100:.1f}%")
    
    # Test cases for each intent
    test_cases = [
        ("greeting", "hi"),
        ("greeting", "hello there"),
        ("small_talk", "how are you"),
        ("small_talk", "what can you do"),
        ("discover", "show me hoodies"),
        ("discover", "recommend black bombers under 50 euros"),
        ("lookup_product", "what material is this bomber made of"),
        ("size_fit", "I'm 175cm and 70kg, what size should I get"),
        ("policy", "what is your return policy"),
        ("policy", "do you ship to France"),
        ("history_meta", "what did we talk about before"),
        ("generic", "tell me about your brand"),
        ("unknown", "asdfghjkl")
    ]
    
    results = []
    for intent, message in test_cases:
        result = test_intent(intent, message)
        results.append(result)
    
    # Summary
    print(f"\n\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    
    total_default = sum(r["default_tokens"] for r in results)
    total_optimized = sum(r["optimized_tokens"] for r in results)
    total_savings = total_default - total_optimized
    avg_savings_pct = (total_savings / total_default * 100) if total_default > 0 else 0
    
    print(f"\n📦 Aggregate Results ({len(results)} test cases):")
    print(f"   Total default tokens:    ~{total_default}")
    print(f"   Total optimized tokens:  ~{total_optimized}")
    print(f"   Total savings:           ~{total_savings} tokens")
    print(f"   Average reduction:       {avg_savings_pct:.1f}%")
    
    print(f"\n✅ Target: 30-40% reduction")
    if avg_savings_pct >= 30:
        print(f"   ✓ PASSED! Achieved {avg_savings_pct:.1f}% reduction")
    else:
        print(f"   ⚠ Below target ({avg_savings_pct:.1f}% < 30%)")
    
    print("\n" + "="*60)
    print("Phase 3 testing complete!")
    print("="*60 + "\n")


if __name__ == "__main__":
    main()
