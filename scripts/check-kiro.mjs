// Verify every Kiro artifact in the repository actually parses and matches
// the documented schema. Run: node scripts/check-kiro.mjs
//
// Kiro itself only checks these when it loads them; this script checks them
// in CI, so a malformed hook or agent file cannot silently disappear.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const kiro = join(root, ".kiro");

const errors = [];
const warnings = [];
let checked = 0;

function fail(path, message) {
  errors.push(`${relative(root, path)}: ${message}`);
}

function warn(path, message) {
  warnings.push(`${relative(root, path)}: ${message}`);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    fail(path, `invalid JSON: ${err.message}`);
    return null;
  }
}

function readYamlFrontMatter(path) {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("---")) return null;
  const end = text.indexOf("\n---", 3);
  if (end === -1) return null;
  return text.slice(3, end);
}

function readFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true }).filter((f) => statSync(join(dir, f)).isFile());
}

// The markdown body of an agent file is its system prompt.
function agentBody(path) {
  const text = readFileSync(path, "utf8");
  if (!text.startsWith("---")) return text;
  const end = text.indexOf("\n---", 3);
  return end === -1 ? "" : text.slice(end + 4);
}

// --- steering (REQ-01, REQ-02) ---------------------------------------------

function checkSteering() {
  const dir = join(kiro, "steering");
  const files = readFiles(dir).filter((f) => f.endsWith(".md"));
  checked += files.length;

  for (const foundation of ["product.md", "tech.md", "structure.md"]) {
    if (!files.includes(foundation)) fail(join(dir, foundation), "foundation steering file missing");
  }

  for (const file of files) {
    const front = readYamlFrontMatter(join(dir, file));
    if (front === null) {
      fail(join(dir, file), "no YAML front matter: an inclusion mode must be declared");
      continue;
    }
    if (!/inclusion:\s*(always|fileMatch|manual|auto)/.test(front)) {
      fail(join(dir, file), `unknown inclusion mode in front matter`);
    }
    if (/inclusion:\s*auto/.test(front) && !/name:\s*\S/.test(front)) {
      fail(join(dir, file), "auto inclusion needs a name");
    }
    if (/inclusion:\s*fileMatch/.test(front) && !/fileMatchPattern/.test(front)) {
      fail(join(dir, file), "fileMatch inclusion needs fileMatchPattern");
    }
  }
}

// --- hooks (REQ-03, REQ-04) ------------------------------------------------

const TRIGGERS = [
  "PostFileSave", "PreFileSave", "FileCreate", "FileDelete", "PreToolUse",
  "PostToolUse", "SessionStart", "Stop", "PostTaskExecution", "PreTaskExecution",
  "PromptSubmit", "PreCompact", "PostCompact", "SessionEnd",
];

function checkHooks() {
  const dir = join(kiro, "hooks");
  const files = readFiles(dir).filter((f) => f.endsWith(".json"));
  checked += files.length;
  const triggers = new Set();

  for (const file of files) {
    const data = readJson(join(dir, file));
    if (!data) continue;
    if (data.version !== "v1") fail(join(dir, file), `unknown schema version "${data.version}"`);
    if (!Array.isArray(data.hooks) || data.hooks.length === 0) {
      fail(join(dir, file), "no hooks declared");
      continue;
    }
    for (const hook of data.hooks) {
      if (!hook.name) fail(join(dir, file), "a hook has no name");
      if (!TRIGGERS.includes(hook.trigger)) fail(join(dir, file), `unknown trigger "${hook.trigger}"`);
      triggers.add(hook.trigger);
      const action = hook.action || {};
      if (!["command", "agent"].includes(action.type)) {
        fail(join(dir, file), `hook "${hook.name}": unknown action type "${action.type}"`);
      }
      if (action.type === "command") {
        if (!action.command) fail(join(dir, file), `hook "${hook.name}": no command`);
        if (typeof action.timeout === "number" && action.timeout < 0) {
          fail(join(dir, file), `hook "${hook.name}": negative timeout`);
        }
      } else if (action.type === "agent" && !action.prompt) {
        fail(join(dir, file), `hook "${hook.name}": no prompt`);
      }
    }
  }

  for (const trigger of ["PostFileSave", "FileCreate", "PreToolUse", "SessionStart", "Stop", "PostTaskExecution"]) {
    if (!triggers.has(trigger)) warn(dir, `no hook covers the ${trigger} trigger`);
  }
}

// Parse the top-level keys of a YAML front matter block. Only what the
// checks need: key presence, scalar values and the text of block values.
// No YAML library, no guessing.
function parseFrontMatter(front) {
  const out = {};
  let current = null;
  for (const line of front.split("\n")) {
    if (!line.trim()) continue;
    const top = /^[A-Za-z][A-Za-z0-9_]*:/.exec(line);
    if (top && !/^\s/.test(line)) {
      current = top[0].slice(0, -1);
      const value = line.slice(top[0].length).trim();
      out[current] = value;
    } else if (current) {
      out[current] = `${out[current]} ${line.trim()}`.trim();
    }
  }
  return out;
}

// --- agents (REQ-07, REQ-08) ----------------------------------------------

function checkAgents() {
  const dir = join(kiro, "agents");
  const files = readFiles(dir).filter((f) => f.endsWith(".md") || f.endsWith(".json"));
  checked += files.length;

  for (const file of files) {
    const path = join(dir, file);
    let data;
    if (file.endsWith(".json")) {
      data = readJson(path);
      if (!data) continue;
    } else {
      const front = readYamlFrontMatter(path);
      if (front === null) {
        fail(path, "no YAML front matter");
        continue;
      }
      data = parseFrontMatter(front);
      if (agentBody(path).trim().length < 40) {
        fail(path, "the agent prompt (the markdown body) is empty");
      }
    }
    if (!data.name) fail(path, "no name");
    if (!data.description) fail(path, "no description");
    if (!data.tools) warn(path, "no tools declared: the agent inherits everything");
    if (!data.permissions) warn(path, "no permissions declared");
    if (!data.resources) {
      fail(path, "no resources: custom agents do not inherit steering, so nothing would be loaded");
    } else if (!String(data.resources).includes("steering") && !String(data.resources).includes("file://")) {
      warn(path, "resources do not include any steering file");
    }
  }
}

// --- skills (REQ-09) -------------------------------------------------------

function checkSkills() {
  const dirs = existsSync(join(kiro, "skills")) ? readdirSync(join(kiro, "skills")) : [];
  for (const dir of dirs) {
    const skill = join(kiro, "skills", dir, "SKILL.md");
    checked += 1;
    if (!existsSync(skill)) {
      fail(join(kiro, "skills", dir), "SKILL.md missing");
      continue;
    }
    const front = readYamlFrontMatter(skill);
    if (front === null) {
      fail(skill, "no YAML front matter");
      continue;
    }
    const name = (front.match(/^name:\s*(.+)$/m) || [])[1];
    if (!name) fail(skill, "no name");
    if (name && name.trim() !== dir) fail(skill, `name "${name.trim()}" must match the folder "${dir}"`);
    const description = (front.match(/^description:\s*(.+)$/m) || [])[1];
    if (!description) fail(skill, "no description: the skill would never activate");
  }
}

// --- workflows (REQ-10, REQ-11) -------------------------------------------

function checkWorkflows() {
  const dir = join(kiro, "workflows");
  const files = readFiles(dir).filter((f) => f.endsWith(".workflow.json"));
  checked += files.length;
  if (files.length === 0) {
    fail(dir, "no workflow recipe found");
    return;
  }
  for (const file of files) {
    const data = readJson(join(dir, file));
    if (!data) continue;
    if (!data.name) fail(join(dir, file), "no name");
    if (!Array.isArray(data.steps) || data.steps.length === 0) fail(join(dir, file), "no steps");
  }
}

// --- MCP (REQ-05, REQ-06) --------------------------------------------------

function checkMcp() {
  const path = join(kiro, "settings", "mcp.json");
  checked += 1;
  const data = readJson(path);
  if (!data) return;
  const servers = data.mcpServers || {};
  if (!servers.labkit) {
    fail(path, "no `labkit` server declared");
    return;
  }
  const server = servers.labkit;
  if (!server.command) fail(path, "the labkit server has no command");
  if (!Array.isArray(server.args) || !server.args.some((a) => a.includes("mcp-server"))) {
    fail(path, "the labkit server does not point at mcp-server/");
  }
  const auto = server.autoApprove || [];
  if (auto.includes("scaffold_law")) {
    fail(path, "scaffold_law writes files: it must not be auto-approved");
  }
}

// --- power (REQ-12) --------------------------------------------------------

function checkPower() {
  const dir = join(root, "power-labkit");
  checked += 1;
  if (!existsSync(dir)) {
    fail(dir, "no power package");
    return;
  }
  const plugin = readJson(join(dir, "plugin.json"));
  if (plugin) {
    if (!plugin.$schema) fail(join(dir, "plugin.json"), "no $schema");
    if (!plugin.name) fail(join(dir, "plugin.json"), "no name");
    if (!plugin.version) fail(join(dir, "plugin.json"), "no version");
    if (!plugin.description) fail(join(dir, "plugin.json"), "no description");
    if (!plugin.author || !plugin.author.name) fail(join(dir, "plugin.json"), "no author.name");
    if (!Array.isArray(plugin.keywords) || plugin.keywords.length === 0) {
      fail(join(dir, "plugin.json"), "no keywords: the power would never activate");
    }
  }
  if (!existsSync(join(dir, "mcp.json"))) warn(dir, "no mcp.json");
  const skills = existsSync(join(dir, "skills")) ? readdirSync(join(dir, "skills")) : [];
  if (skills.length === 0) warn(dir, "no skill bundled with the power");
}

// --- kiroignore / AGENTS.md (REQ-13, REQ-14) -------------------------------

function checkRootFiles() {
  checked += 2;
  if (!existsSync(join(root, ".kiroignore"))) fail(join(root, ".kiroignore"), "missing");
  if (!existsSync(join(root, "AGENTS.md"))) fail(join(root, "AGENTS.md"), "missing");
}

checkSteering();
checkHooks();
checkAgents();
checkSkills();
checkWorkflows();
checkMcp();
checkPower();
checkRootFiles();

for (const w of warnings) console.log(`::warning::${w}`);
for (const e of errors) console.log(`::error::${e}`);
console.log(`${checked} Kiro artifact(s) checked: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length === 0 ? 0 : 1);
