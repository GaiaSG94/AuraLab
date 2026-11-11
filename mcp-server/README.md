# LabKit MCP server (dev tool)

Exposes the kit to the Kiro agent over stdio (Model Context Protocol).
Zero dependencies. The labs themselves never use it — it assists whoever
builds labs.

## Setup in Kiro

1. Open the LabKit folder in Kiro (workspace root).
2. Ensure Node.js is on PATH (`node --version`).
3. The workspace config `.kiro/settings/mcp.json` already declares the server:

```json
{
  "mcpServers": {
    "labkit": {
      "command": "node",
      "args": ["mcp-server/index.js"],
      "autoApprove": ["list_catalog", "list_labs", "validate_lab", "headless_check"]
    }
  }
}
```

4. Reload MCP servers in Kiro (MCP panel → reload) and check `labkit` appears
   with 5 tools.
5. If Kiro does not resolve the relative path, replace `args` with the
   absolute path to `mcp-server/index.js`.

The same server is bundled in the Kiro power at `power-labkit/mcp.json`, so
it also loads for anyone who installs the power from GitHub.

## Tools

| Tool | Reads/writes | Approval |
|---|---|---|
| `list_catalog` | Laws, apparatus and instruments with their notices (rule, sources, limits). Optional `category` filter. | auto (read-only) |
| `list_labs` | The four shipped labs: title, pack, laws, metrics, note. | auto (read-only) |
| `validate_lab` | Validates one lab (`app-space`, `app-eco`, `app-chimie`, `app-ponts`) or `all`. Returns OK/FAIL with warnings and errors. | auto (read-only) |
| `headless_check` | Boots a lab without a browser and simulates it for N frames (default 600). Reports the measures and whether they stayed finite. | auto (read-only) |
| `scaffold_law` | Creates a law module and registers it in the pack. The file contains a TODO. | **confirm each call** (it writes) |

## Files

| File | Role |
|---|---|
| `index.js` | stdio JSON-RPC transport (initialize, tools/list, tools/call) |
| `tools.mjs` | tool definitions and their implementations |
| `catalog.mjs` | catalog merge, lab discovery, config reading |
| `smoke-test.mjs` | spawns the server and drives every tool |

The server imports the same `core/validate.js` the browser uses, so a config
that validates here validates in the lab.

## Test without Kiro

```powershell
node mcp-server/smoke-test.mjs
```

Spawns the server over stdio, runs `initialize` → `tools/list` → every tool,
and checks the answers. CI runs it on every commit.
