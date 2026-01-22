#!/usr/bin/env python3
"""
Show actual product details from outfit generation
"""
import asyncio
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.agents.stylist_agent import StylistAgent
from app.connection import get_db_connection

async def show_outfit_products():
    """Generate outfit and show actual product details"""
    db = get_db_connection()
    agent = StylistAgent(name='product_checker', db=db)
    
    test_cases = [
        {
            'query': 'formal blazer and pants for a business meeting',
            'context': {'budget': 300, 'gender': 'men'},
            'name': 'Formal Men\'s Business Outfit'
        },
        {
            'query': 'casual date night outfit',
            'context': {'budget': 300, 'gender': 'women'},
            'name': 'Women\'s Date Night Outfit'
        }
    ]
    
    for test in test_cases:
        print('\n' + '=' * 80)
        print(f'🎯 {test["name"]}')
        print(f'Query: "{test["query"]}"')
        print('=' * 80)
        
        result = await agent.execute(
            query=test['query'],
            context=test['context']
        )
        
        print(f'\n Status: {result.get("status")}')
        
        # Show actual items
        candidates = result.get('candidates', {})
        if not candidates:
            print('❌ No candidates returned!')
            continue
            
        for category, items in candidates.items():
            print(f'\n📦 {category.upper()} - {len(items)} items found')
            print('-' * 80)
            
            for i, item in enumerate(items[:5], 1):  # Show first 5
                brand = item.get('brand', 'Unknown')
                desc = item.get('description', 'No description')
                item_type = item.get('type', '?')
                gender = item.get('gender', '?')
                price = item.get('price', '?')
                
                print(f'{i}. [{brand}] {desc[:60]}...')
                print(f'   Type: {item_type} | Gender: {gender} | €{price}')
    
    db.close()

if __name__ == '__main__':
    asyncio.run(show_outfit_products())
