
import asyncio
import os
import sys

# Set up environment
sys.path.append(os.getcwd())
# Assuming local dev env
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5432/postgres"

# Mock classes to avoid full imports if possible, but better to use real ones for integration
# We will just print the CURL command as that's the real integration test

if __name__ == "__main__":
    print("ℹ️  Use curl to verify against the running server:")
    cmd = """curl -X POST "http://localhost:8000/ai/agent/query-stream" \
     -H "Content-Type: application/json" \
     -d '{"message": "Build me an outfit for date night", "guestSessionId": "test_crash_fix_v2", "sessionType": "outfit_builder"}'"""
    print(cmd)
    os.system(cmd)
