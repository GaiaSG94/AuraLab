// Smoke test for the MCP server: spawn it over stdio, drive every tool, check
// the answers. Run: node mcp-server/smoke-test.mjs
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = spawn(process.execPath, [join(root, "mcp-server", "index.js")], {
  cwd: root,
  stdio: ["pipe", "pipe", "inherit"],
});

let buffer = "";
const pending = new Map();
server.stdout.setEncoding("utf8");
server.stdout.on("data", (chunk) => {
  buffer += chunk;
  let idx;
  while ((idx = buffer.indexOf("\n")) >= 0) {
    const line = buffer.slice(0, idx).trim();
    buffer = buffer.slice(idx + 1);
    if (!line) continue;
    const msg = JSON.parse(line);
    const resolver = pending.get(msg.id);
    if (resolver) {
      pending.delete(msg.id);
      resolver(msg);
    }
  }
});

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
    server.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
  });
}

const failures = [];
function expect(name, condition, detail) {
  if (condition) console.log(`ok   ${name}`);
  else {
    console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures.push(name);
  }
}

function payload(result) {
  return JSON.parse(result.content[0].text);
}

const init = await request("initialize", { protocolVersion: "2025-06-18", capabilities: {} });
expect("initialize answers with the labkit server", init.serverInfo.name === "labkit", init.serverInfo.name);

const list = await request("tools/list", {});
const names = list.tools.map((t) => t.name).sort();
const expected = ["headless_check", "list_catalog", "list_labs", "scaffold_law", "validate_lab"];
expect("every tool is exposed", JSON.stringify(names) === JSON.stringify(expected), names.join(","));

const catalog = payload(await request("tools/call", { name: "list_catalog", arguments: {} }));
expect("list_catalog returns laws", catalog.laws.length > 0);
expect("every law carries a notice", catalog.laws.every((l) => l.notice && l.notice.formule));

const labs = payload(await request("tools/call", { name: "list_labs", arguments: {} }));
expect("list_labs returns the four labs", labs.labs.length === 4, String(labs.labs.length));

const validation = payload(await request("tools/call", { name: "validate_lab", arguments: { lab: "all" } }));
expect("every shipped lab validates", validation.ok === true, JSON.stringify(validation.labs));

const headless = payload(await request("tools/call", { name: "headless_check", arguments: { lab: "app-eco", frames: 120 } }));
expect("headless_check stays finite", headless.finite === true);
expect("headless_check reports measures", typeof headless.measures === "object");

server.stdin.end();
console.log(`\n${failures.length === 0 ? "all MCP checks pass" : `${failures.length} MCP check(s) failed`}`);
process.exit(failures.length === 0 ? 0 : 1);
