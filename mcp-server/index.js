// LabKit MCP server — exposes lab operations to the Kiro agent over stdio.
// Started by Kiro (see .kiro/settings/mcp.json). Zero dependencies.
// Protocol: newline-delimited JSON-RPC 2.0 (MCP stdio transport).
import { TOOLS, callTool, coded } from "./tools.mjs";

function send(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

async function dispatch(method, params) {
  if (method === "initialize") {
    return {
      protocolVersion: params.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "labkit", version: "1.0.0" },
    };
  }
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: TOOLS };
  if (method === "tools/call") return callTool(params);
  throw coded(`Unknown method: ${method}`, -32601);
}

let buffer = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  const pending = [];
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (line) pending.push(handleLine(line));
  }
  Promise.all(pending).catch(() => {});
});

async function handleLine(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return;
  if (msg.method.startsWith("notifications/")) return; // no response
  try {
    const result = await dispatch(msg.method, msg.params || {});
    if (msg.id !== undefined) send({ jsonrpc: "2.0", id: msg.id, result });
  } catch (err) {
    if (msg.id !== undefined) {
      send({
        jsonrpc: "2.0",
        id: msg.id,
        error: { code: err.code || -32603, message: String((err && err.message) || err) },
      });
    }
  }
}
