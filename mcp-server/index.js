// AuraLab MCP server — exposes lab operations to the Kiro agent over stdio.
// Started by Kiro (see .kiro/settings/mcp.json). Zero dependencies.
// Protocol: newline-delimited JSON-RPC 2.0 (MCP stdio transport).
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const { validateConfig } = await import(pathToFileURL(join(root, "core/validate.js")).href);
const { builtinInstruments } = await import(pathToFileURL(join(root, "core/catalog.js")).href);
const { particlePack } = await import(pathToFileURL(join(root, "engines/particles/index.js")).href);
const { chimiePack } = await import(pathToFileURL(join(root, "engines/chimie/index.js")).href);
const { pontsPack } = await import(pathToFileURL(join(root, "engines/ponts/index.js")).href);
const packs = [particlePack, chimiePack, pontsPack];
const { buildLawSource, registerLaw } = await import(pathToFileURL(join(root, "scripts/add-element.mjs")).href);

const TOOLS = [
  {
    name: "list_catalog",
    description: "List AuraLab catalog entries with their notices (rule, sources, limits). Filter by category.",
    inputSchema: {
      type: "object",
      properties: { category: { type: "string", enum: ["laws", "apparatus", "instruments"] } },
      additionalProperties: false,
    },
  },
  {
    name: "validate_lab",
    description: "Validate one lab config or all labs. Returns OK/FAIL with warnings and errors.",
    inputSchema: {
      type: "object",
      properties: { lab: { type: "string", enum: ["app-space", "app-eco", "app-chimie", "app-ponts", "all"] } },
      additionalProperties: false,
    },
  },
  {
    name: "scaffold_law",
    description: "Create a new particle-law module from fields and register it in the pack. The file contains a TODO to finish before use.",
    inputSchema: {
      type: "object",
      required: ["id", "label", "formule", "sources", "limites"],
      properties: {
        id: { type: "string", description: "kebab-case id, e.g. vent-solaire" },
        label: { type: "string" },
        formule: { type: "string" },
        sources: { type: "string" },
        limites: { type: "string" },
        kind: { type: "string", enum: ["force", "steering", "interaction", "init"] },
        params: { type: "object", description: "default params, e.g. {\"k\": 1.5}" },
      },
      additionalProperties: false,
    },
  },
];

function listCatalog({ category }) {
  const out = {};
  if (!category || category === "laws") {
    out.laws = packs.flatMap((pack) => Object.keys(pack.laws).map((id) => ({
      id,
      pack: pack.id,
      notice: pack.laws[id].notice,
      defaults: pack.laws[id].defaults || {},
    })));
  }
  if (!category || category === "apparatus") {
    out.apparatus = packs.flatMap((pack) => Object.keys(pack.apparatus).map((kind) => ({
      kind,
      pack: pack.id,
      notice: pack.apparatus[kind].notice,
      defaults: pack.apparatus[kind].defaults || {},
    })));
  }
  if (!category || category === "instruments") {
    out.instruments = Object.keys(builtinInstruments).map((type) => ({
      type,
      notice: builtinInstruments[type].notice,
    }));
  }
  return out;
}

async function validateLab({ lab }) {
  const dirs = (lab && lab !== "all" ? [lab] : readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("app-"))
    .map((d) => d.name));
  const results = [];
  for (const dir of dirs) {
    const file = join(root, dir, "config.json");
    let raw;
    try {
      raw = JSON.parse(readFileSync(file, "utf8"));
    } catch (err) {
      results.push({ lab: dir, ok: false, errors: [`invalid JSON: ${err.message}`], warnings: [] });
      continue;
    }
    let labManifest = { measures: [] };
    try {
      const mod = await import(pathToFileURL(join(root, dir, "lab.js")).href);
      labManifest = mod.labManifest || labManifest;
    } catch (err) {
      try {
        const game = await import(pathToFileURL(join(root, dir, "game.js")).href);
        labManifest = game.gameManifest || labManifest;
      } catch (err2) {
        results.push({ lab: dir, ok: false, errors: [`cannot load lab.js: ${err.message}`], warnings: [] });
        continue;
      }
    }
    const known = {
      laws: {},
      apparatus: packs.flatMap((p) => Object.keys(p.apparatus)),
      instruments: Object.keys(builtinInstruments),
      measures: [...packs.flatMap((p) => p.measures.map((m) => m.id)), ...labManifest.measures.map((m) => m.id)],
      surfaces: ["stage"],
    };
    packs.forEach((pack) => {
      Object.keys(pack.laws).forEach((id) => {
        known.laws[id] = { defaults: pack.laws[id].defaults || {} };
      });
    });
    const { config, warnings, errors } = validateConfig(raw, known);
    results.push({ lab: dir, ok: !!config, errors, warnings });
  }
  return { ok: results.every((r) => r.ok), labs: results };
}

function scaffoldLaw({ id, label, formule, sources, limites, kind, params }) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id || "")) {
    throw new Error('id must be kebab-case (e.g. "vent-solaire")');
  }
  const file = join(root, "engines/particles/laws", `${id}.js`);
  if (existsSync(file)) throw new Error(`${id}.js already exists`);
  const kinds = ["force", "steering", "interaction", "init"];
  const src = buildLawSource({
    id,
    label: label || id,
    formule: formule || "",
    sources: sources || "",
    limites: limites || "",
    kind: kinds.includes(kind) ? kind : "force",
    params: params && typeof params === "object" ? params : {},
  });
  writeFileSync(file, src);
  const indexFile = join(root, "engines/particles/index.js");
  writeFileSync(indexFile, registerLaw(readFileSync(indexFile, "utf8"), id));
  return {
    path: `engines/particles/laws/${id}.js`,
    registered: true,
    next: [
      "Finish the TODO in the generated file (see gravitation.js for a force example).",
      "Run validate_lab to check the pack.",
      `Add { "law": "${id}" } to a lab config to use it.`,
    ],
  };
}

async function callTool({ name, arguments: args }) {
  const a = args && typeof args === "object" ? args : {};
  if (name === "list_catalog") return answer(listCatalog(a));
  if (name === "validate_lab") return answer(await validateLab(a));
  if (name === "scaffold_law") return answer(scaffoldLaw(a));
  throw coded(`Unknown tool: ${name}`, -32602);
}

function answer(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function coded(message, code) {
  return Object.assign(new Error(message), { code });
}

async function dispatch(method, params) {
  if (method === "initialize") {
    return {
      protocolVersion: params.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "auralab", version: "1.0.0" },
    };
  }
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: TOOLS };
  if (method === "tools/call") return callTool(params);
  throw coded(`Unknown method: ${method}`, -32601);
}

function send(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
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
      send({ jsonrpc: "2.0", id: msg.id, error: { code: err.code || -32603, message: String((err && err.message) || err) } });
    }
  }
}
