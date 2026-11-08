# AuraLab MCP server (dev tool)

Exposes lab operations to the Kiro agent over stdio (Model Context Protocol).
Zero dependencies. The labs themselves never use it — it assists whoever builds labs.

## Setup in Kiro

1. Open the AuraLab folder in Kiro (workspace root).
2. Ensure Node.js is on PATH (`node --version`).
3. The workspace config `.kiro/settings/mcp.json` already declares the server:

```json
{
  "mcpServers": {
    "auralab": {
      "command": "node",
      "args": ["mcp-server/index.js"],
      "autoApprove": ["list_catalog", "validate_lab"]
    }
  }
}
```

4. Reload MCP servers in Kiro (MCP panel → reload) and check `auralab` appears with 3 tools.
5. If Kiro does not resolve the relative path, replace `args` with the absolute path
   to `mcp-server/index.js`.

## Tools

| Tool | Reads/writes | Approval |
|---|---|---|
| `list_catalog` | Lists catalog laws/apparatus/instruments + notices. Optional `category` filter. | auto-approved (read-only) |
| `validate_lab` | Validates `app-space`, `app-eco` or `all`. Optional `lab`. | auto-approved (read-only) |
| `scaffold_law` | Creates a law module + registers it. NOT auto-approved: Kiro asks first. | confirm each call |

## Test without Kiro

```powershell
node C:\Users\gaiam\AppData\Local\Temp\mcp-smoke.mjs
```

(spawns the server over stdio, runs initialize → tools/list → all 3 tools,
then reverts the scaffolded test law).
