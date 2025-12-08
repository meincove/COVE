#!/usr/bin/env python3
"""Quick verification script for embedded products"""
import asyncio
import asyncpg
import os
import sys
from pathlib import Path

# Add to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent.parent / '.env')

async def check():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    
    total = await conn.fetchval('SELECT COUNT(*) FROM ai_products')
    with_emb = await conn.fetchval('''
        SELECT COUNT(*) FROM ai_products 
        WHERE embedding IS NOT NULL
    ''')
    
    by_type = await conn.fetch('''
        SELECT type, COUNT(*) as count 
        FROM ai_products 
        GROUP BY type 
        ORDER BY type
    ''')
    
    print(f'\n✅ Database Status:')
    print(f'   Total products: {total}')
    print(f'   With embeddings: {with_emb}\n')
    print('   By type:')
    for row in by_type:
        print(f'     {row["type"]}: {row["count"]} variants')
    
    await conn.close()
   
if __name__ == '__main__':
    asyncio.run(check())
