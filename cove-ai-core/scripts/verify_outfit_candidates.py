#!/usr/bin/env python3
"""
Verify Outfit Candidates Script
================================
Shows the candidate products returned for outfit queries and validates
if they match the user's request.
"""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agents.stylist_agent import StylistAgent
from app.vector.store import get_conn

# ANSI color codes
class Colors:
    CYAN = '\033[96m'
    YELLOW = '\033[93m'
    GREEN = '\033[92m'
    RED = '\033[91m'
    WHITE = '\033[97m'
    MAGENTA = '\033[95m'
    RESET = '\033[0m'


def print_header(text: str):
    """Print a styled header"""
    print(f"\n{Colors.CYAN}{'=' * 80}")
    print(f"{Colors.CYAN}{text:^80}")
    print(f"{Colors.CYAN}{'=' * 80}{Colors.RESET}\n")


def print_section(text: str):
    """Print a styled section"""
    print(f"\n{Colors.YELLOW}▶ {text}")
    print(f"{Colors.YELLOW}{'-' * 80}{Colors.RESET}")


def print_product(product: dict, index: int):
    """Print product details in a readable format"""
    print(f"\n  {Colors.GREEN}#{index + 1} - {product.get('name', product.get('title', 'Unknown'))}{Colors.RESET}")
    print(f"     Type: {Colors.WHITE}{product.get('type', 'N/A')}{Colors.RESET}")
    print(f"     Gender: {Colors.WHITE}{product.get('gender', 'N/A')}{Colors.RESET}")
    print(f"     Color: {Colors.WHITE}{product.get('color', 'N/A')}{Colors.RESET}")
    print(f"     Brand: {Colors.WHITE}{product.get('brand', 'N/A')}{Colors.RESET}")
    print(f"     Price: {Colors.WHITE}${product.get('price', 'N/A')}{Colors.RESET}")
    
    # Show matching score if available
    if 'similarity' in product:
        print(f"     Score: {Colors.MAGENTA}{product['similarity']:.3f}{Colors.RESET}")


def validate_candidate(product: dict, expected_filters: dict) -> list:
    """Validate if a product matches expected filters"""
    issues = []
    
    # Check gender
    expected_gender = expected_filters.get('gender')
    if expected_gender and expected_gender != 'unisex':
        product_gender = product.get('gender', '').lower()
        if product_gender not in [expected_gender.lower(), 'unisex', '']:
            issues.append(f"Gender mismatch: expected {expected_gender}, got {product_gender}")
    
    # Check type if specified
    expected_type = expected_filters.get('type')
    if expected_type:
        product_type = product.get('type', '').lower()
        if expected_type.lower() not in product_type and product_type not in expected_type.lower():
            issues.append(f"Type mismatch: expected {expected_type}, got {product_type}")
    
    # Check color if specified
    expected_color = expected_filters.get('color')
    if expected_color:
        product_color = product.get('color', '').lower()
        if expected_color.lower() not in product_color:
            issues.append(f"Color mismatch: expected {expected_color}, got {product_color}")
    
    return issues


async def verify_outfit_query(query: str, context: dict = None):
    """Verify candidates for a single outfit query"""
    print_header(f"QUERY: {query}")
    
    if context is None:
        context = {}
    
    # Initialize agent with database connection from context manager
    agent = StylistAgent(name="stylist")
    
    try:
        # Execute the agent with connection
        print_section("Executing Stylist Agent")
        with get_conn() as db:
            # StylistAgent expects task dict with query inside
            task = {"query": query}
            result = await agent.execute(task=task, context=context)
        
        # Show analysis
        print_section("Analysis Results")
        # AgentResult stores data in the 'data' attribute
        result_data = result.data if hasattr(result, 'data') else result
        analysis = result_data.get('analysis', {})
        print(f"  Gender: {Colors.WHITE}{analysis.get('gender', 'N/A')}{Colors.RESET}")
        print(f"  Style: {Colors.WHITE}{analysis.get('style', 'N/A')}{Colors.RESET}")
        print(f"  Occasion: {Colors.WHITE}{analysis.get('occasion', 'N/A')}{Colors.RESET}")
        print(f"  Colors: {Colors.WHITE}{analysis.get('colors', 'N/A')}{Colors.RESET}")
        
        # Show outfit categories and candidates
        outfits = result_data.get('outfits', [])
        if not outfits:
            print(f"\n{Colors.RED}⚠ No outfits returned!{Colors.RESET}")
            return
        
        print_section(f"Found {len(outfits)} Outfit(s)")
        
        total_candidates = 0
        total_issues = 0
        
        for outfit_idx, outfit in enumerate(outfits):
            print(f"\n{Colors.CYAN}══ Outfit #{outfit_idx + 1} ══{Colors.RESET}")
            
            categories = outfit.get('categories', {})
            for cat_name, cat_data in categories.items():
                candidates = cat_data.get('candidates', [])
                total_candidates += len(candidates)
                
                print(f"\n  {Colors.YELLOW}Category: {cat_name.upper()}{Colors.RESET}")
                print(f"  Candidates: {len(candidates)}")
                
                if candidates:
                    for idx, product in enumerate(candidates):
                        print_product(product, idx)
                        
                        # Validate candidate
                        expected_filters = {
                            'gender': analysis.get('gender'),
                            'color': cat_data.get('color'),  # Category-specific color
                        }
                        
                        issues = validate_candidate(product, expected_filters)
                        if issues:
                            total_issues += len(issues)
                            for issue in issues:
                                print(f"       {Colors.RED}✗ {issue}{Colors.RESET}")
                        else:
                            print(f"       {Colors.GREEN}✓ Matches criteria{Colors.RESET}")
                else:
                    print(f"  {Colors.RED}No candidates found!{Colors.RESET}")
        
        # Summary
        print_section("Validation Summary")
        print(f"  Total Candidates: {Colors.WHITE}{total_candidates}{Colors.RESET}")
        print(f"  Issues Found: {Colors.RED if total_issues > 0 else Colors.GREEN}{total_issues}{Colors.RESET}")
        
        if total_issues == 0:
            print(f"\n  {Colors.GREEN}✓ All candidates match the query criteria!{Colors.RESET}")
        else:
            print(f"\n  {Colors.RED}✗ Some candidates don't match the query criteria{Colors.RESET}")
        
    except Exception as e:
        print(f"\n{Colors.RED}ERROR: {str(e)}{Colors.RESET}")
        import traceback
        traceback.print_exc()


async def main():
    """Run verification tests"""
    print_header("OUTFIT CANDIDATE VERIFICATION")
    
    # Test queries
    test_cases = [
        {
            "query": "I need a formal black suit for a wedding",
            "context": {}
        },
        {
            "query": "Show me casual outfits for men",
            "context": {}
        },
        {
            "query": "I want a date night outfit for my girlfriend",
            "context": {}
        },
    ]
    
    for i, test_case in enumerate(test_cases):
        await verify_outfit_query(
            query=test_case["query"],
            context=test_case["context"]
        )
        
        if i < len(test_cases) - 1:
            print(f"\n\n{Colors.CYAN}{'─' * 80}{Colors.RESET}\n")
            await asyncio.sleep(1)  # Brief pause between queries


if __name__ == "__main__":
    asyncio.run(main())
