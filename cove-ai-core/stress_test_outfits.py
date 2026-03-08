import asyncio
import logging
import sys
from app.agents.outfit_builder_agent import OutfitBuilderAgent

# Configure simple logging
logging.basicConfig(level=logging.ERROR)
logging.getLogger("cove.agents.outfit_builder").setLevel(logging.INFO)

SCENARIOS = [
    {
        "name": "🤵 Formal Wedding",
        "task": {"occasion": "Attending a formal black-tie wedding", "style": "Formal", "gender": "Men", "budget_max": 500}
    },
    {
        "name": "🏃‍♀️ HIIT Gym Workout",
        "task": {"occasion": "High intensity interval training at the gym", "style": "Active", "gender": "Women", "budget_max": 200}
    },
    {
        "name": "🏖️ Hawaii Beach Vacation",
        "task": {"occasion": "Relaxing beach vacation in Hawaii", "style": "Resort", "gender": "Men", "budget_max": 300}
    },
    {
        "name": "👩‍💻 Tech Job Interview",
        "task": {"occasion": "Interview at a modern tech startup", "style": "Business Casual", "gender": "Women", "budget_max": 400}
    },
    {
        "name": "🍸 Cocktail Bar Date",
        "task": {"occasion": "First date at a fancy cocktail bar", "style": "Elegant", "gender": "Women", "budget_max": 300}
    },
    {
        "name": "🏔️ Alpine Hiking",
        "task": {"occasion": "Hiking in the mountains during autumn", "style": "Outdoor", "gender": "Men", "budget_max": 400}
    },
    {
        "name": "🛋️ Cozy Night In",
        "task": {"occasion": "Lazy Sunday morning at home reading", "style": "Loungewear", "gender": "Women", "budget_max": 150}
    },
    {
        "name": "🎸 90s Grunge Party",
        "task": {"occasion": "90s grunge themed costume party", "style": "Retro", "gender": "Men", "budget_max": 200}
    },
    {
        "name": "🎡 Music Festival",
        "task": {"occasion": "Summer music festival like Coachella", "style": "Bohemian", "gender": "Women", "budget_max": 300}
    },
    {
        "name": "⚫ Somber Funeral",
        "task": {"occasion": "Respectful funeral service", "style": "Conservative", "gender": "Men", "budget_max": 400}
    }
]

async def run_stress_test():
    agent = OutfitBuilderAgent("outfit_builder")
    
    report_lines = []
    report_lines.append(f"# 🚀 COMPLETE OUTFIT BUILDER STRESS TEST REPORT")
    report_lines.append(f"**Total Scenarios:** {len(SCENARIOS)}\n")

    print(f"🚀 STARTING STRESS TEST: {len(SCENARIOS)} Scenarios (Writing to stress_test_report.md)...")

    for i, scenario in enumerate(SCENARIOS, 1):
        print(f"   ...Processing Scenario {i}: {scenario['name']}")
        
        report_lines.append(f"## 🔸 Scenario {i}: {scenario['name']}")
        report_lines.append(f"**Context:** `{scenario['task']}`\n")
        
        candidates_by_cat = {}

        async def callback(event):
            if event.get("event_type") == "category_candidates":
                cat = event["category"]
                items = event["candidates"]
                # Store titles for report (Take top 10 for detailed view)
                titles = [f"{item.get('title')} ({item.get('type', 'item')}) - €{item.get('price')}" for item in items[:10]]
                candidates_by_cat[cat] = titles

        try:
            result = await agent.execute(scenario["task"], {}, stream_callback=callback)
            
            # Application Plan Details (if visible via logs, but here we capture output)
            # Add Candidates
            report_lines.append(f"### 📋 Candidate Lists (Post-Filtering)")
            for cat, items in candidates_by_cat.items():
                report_lines.append(f"**{cat.upper()}:**")
                for item in items:
                    report_lines.append(f"- {item}")
                report_lines.append("")
            
            # Add Final Selection
            report_lines.append(f"### ✨ Final Outfit Selection")
            outfit_items = result.data.get("outfit_items", [])
            if not outfit_items:
                 report_lines.append("❌ No outfit generated.")
            else:
                for item in outfit_items:
                    line = f"✅ **[{item.get('category')}]** {item.get('title', 'Unknown')} -- €{item.get('price')}"
                    if item.get("stylist_note"):
                        line += f" <br>⚠️ *Note: {item['stylist_note']}*"
                    report_lines.append(line)
        except Exception as e:
            report_lines.append(f"❌ CRITICAL ERROR: {e}")
        
        report_lines.append("\n---\n")

    # Write to file
    with open("cove-ai-core/stress_test_report.md", "w") as f:
        f.write("\n".join(report_lines))
    
    print("\n✅ STRESS TEST COMPLETE. Report saved to: cove-ai-core/stress_test_report.md")

if __name__ == "__main__":
    asyncio.run(run_stress_test())
