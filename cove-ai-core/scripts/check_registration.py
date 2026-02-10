
from app.core.agent_registry import registry
import app.agents  # This should trigger registration

print("Registered Agents:")
for agent in registry.list_all():
    print(f"- {agent['name']}")

if "vto_agent" in registry.agents:
    print("\n✅ vto_agent is registered!")
else:
    print("\n❌ vto_agent is NOT registered!")
