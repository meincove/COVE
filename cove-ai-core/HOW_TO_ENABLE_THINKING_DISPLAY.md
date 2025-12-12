## 🚀 How to Enable Thinking Display

### Option 1: Enable Globally (Recommended for Testing)

Edit this file:
```bash
/Users/ssg/Desktop/COVE/cove-ai-core/data/agent_display_config.json
```

Change line 2 from:
```json
"enabled": false,
```

To:
```json
"enabled": true,
```

### Option 2: One-Command Enable

```bash
# To enable:
cd /Users/ssg/Desktop/COVE/cove-ai-core
sed -i '' 's/"enabled": false/"enabled": true/' data/agent_display_config.json

# To disable (rollback):
sed -i '' 's/"enabled": true/"enabled": false/' data/agent_display_config.json
```

### No .env Changes Needed!

The feature-flagged via the JSON config file, not environment variables.  
This makes it easy to enable/disable without restarting the server.

### Verify It's Working

After enabling, make a request to `/ai/agent/query` and check the response for:
- `thinking_events`: Array of thinking steps
- `tools_used`: Array of tools called

If disabled (default), these fields won't appear in the response.
