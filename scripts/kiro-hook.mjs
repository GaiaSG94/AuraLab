// Kiro hook helper: deterministic checks the agent cannot skip.
//
// Each hook action is a shell command; this script is what those commands
// call. It reads the hook event JSON on STDIN (shape differs per trigger,
// so every field is optional) and dispatches on the mode given in argv.
//
// Modes:
//   check-js        PostFileSave on a .js file  -> node --check on it
//   guard-commit    PreToolUse before git commit/push -> refuse if the repo
//                   is not in a shippable state (configs, tests, dist/)
//   session-context SessionStart -> print the repo facts the agent needs
//   task-check      PostTaskExecution -> re-check after a spec task
//   stop-check      Stop -> final report; ask the agent to keep working
//                   once if the repo is not shippable
//
// Exit codes: 0 = fine, 2 = block the tool call (PreToolUse), 1 = error.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readEvent() {
  try {
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function eventFile(event) {
  return event.file_path || event.filePath || (event.tool_input && event.tool_input.file_path) || "";
}

function eventCommand(event) {
  const input = event.tool_input || {};
  return String(input.command || input.cmd || input.script || "");
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: root, encoding: "utf8", shell: false });
}

function say(message) {
  process.stderr.write(`${message}\n`);
}

// --- the shippable-state check --------------------------------------------

// Runs every gate the repo needs before a change may be shipped.
// Returns { ok, failures: [string] }.
function shipChecks() {
  const failures = [];

  const configs = run(process.execPath, ["scripts/validate-config.mjs"]);
  if (configs.status !== 0) {
    failures.push(`a lab config is invalid:\n${(configs.stderr || configs.stdout || "").trim()}`);
  }

  const tests = run(process.execPath, ["tests/run-tests.mjs"]);
  if (tests.status !== 0) {
    const out = (tests.stdout || "").split("\n").filter((l) => l.startsWith("FAIL") || l.startsWith("     "));
    failures.push(`a property test fails:\n${out.join("\n").trim()}`);
  }

  const build = run(process.execPath, ["scripts/build-standalone.mjs"]);
  if (build.status !== 0) {
    failures.push(`the standalone build failed:\n${(build.stderr || "").trim()}`);
  } else {
    const dirty = run("git", ["status", "--porcelain", "--", "dist/"]);
    if (dirty.status === 0 && dirty.stdout.trim() !== "") {
      failures.push(`dist/ is out of date, rebuild and commit it:\n${dirty.stdout.trim()}`);
    }
  }

  return { ok: failures.length === 0, failures };
}

// --- modes -----------------------------------------------------------------

function checkJs(event) {
  const file = eventFile(event);
  if (!file || !file.endsWith(".js")) return 0;
  if (file.includes(`${"node_modules"}/`) || file.includes("/dist/")) return 0;
  const result = run(process.execPath, ["--check", file]);
  if (result.status !== 0) {
    say(`Syntax error in ${file}:\n${(result.stderr || "").trim()}`);
    return 1;
  }
  return 0;
}

function isShipCommand(command) {
  return /\bgit\s+(commit|push|merge|rebase)\b/.test(command);
}

function guardCommit(event) {
  const command = eventCommand(event);
  if (!isShipCommand(command)) return 0;

  const { ok, failures } = shipChecks();
  if (!ok) {
    say("Blocked: the repository is not in a shippable state.");
    failures.forEach((f) => say(f));
    return 2;
  }
  return 0;
}

function taskCheck() {
  const { ok, failures } = shipChecks();
  if (ok) {
    process.stdout.write("All checks pass: configs valid, properties hold, dist/ up to date.\n");
    return 0;
  }
  say("Checks failed after this task:");
  failures.forEach((f) => say(f));
  return 1;
}

// The Stop hook may ask the agent to keep working. To avoid an endless loop,
// the same failure is only reported once per session (marker in the temp dir).
function stopCheck(event) {
  const { ok, failures } = shipChecks();
  if (ok) {
    process.stdout.write("Final check: everything is green.\n");
    return 0;
  }
  const marker = join(tmpdir(), `labkit-stop-${event.session_id || "default"}.marker`);
  const signature = failures.join("|");
  if (existsSync(marker) && readFileSync(marker, "utf8") === signature) {
    process.stdout.write("Final check: still failing (already reported, not blocking again).\n");
    return 0;
  }
  try {
    mkdirSync(tmpdir(), { recursive: true });
    writeFileSync(marker, signature);
  } catch {
    /* the temp dir is not writable: report once and move on */
  }
  process.stdout.write(
    `${JSON.stringify({
      decision: "block",
      reason: `The repository is not shippable yet:\n${failures.join("\n")}\nFix these, then finish the turn.`,
    })}\n`,
  );
  return 0;
}

function sessionContext() {
  const labs = ["app-space", "app-eco", "app-chimie", "app-ponts"];
  const lines = [
    "LabKit — one kit, many labs. Zero dependency, zero build step.",
    "",
    "Labs: " + labs.map((l) => `${l}/`).join(" "),
    "A new lab = a new app-<name>/ folder (config.json + lab.js + index.html). Never edit core/ for a lab.",
    "Config = data (lab, bench, bounds, substances, material, laws, metrics, instruments, controls, notebook).",
    "",
    "Commands:",
    "  node scripts/validate-config.mjs   validate every app-*/config.json",
    "  node scripts/build-standalone.mjs  rebuild dist/*.html (commit the result)",
    "  node tests/run-tests.mjs           property-based tests (REQ-numbers in the names)",
    "  node mcp-server/index.js           MCP server: list_catalog, list_labs, validate_lab, headless_check",
    "",
    "Rules: laws never touch the DOM; every law carries a notice (rule, sources, limits);",
    "every new invariant gets a property test named after its REQ; files < 500 lines.",
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
  return 0;
}

function checkLawRegistration(event) {
  const file = eventFile(event);
  if (!file || !file.endsWith(".js")) return 0;
  const match = file.match(/engines[\\/]([^\\/]+)[\\/]laws[\\/]([^\\/]+)\.js$/);
  if (!match) return 0;
  const [, pack, lawId] = match;
  const indexFile = join(root, "engines", pack, "index.js");
  if (!existsSync(indexFile)) {
    say(`The pack ${pack} has no index.js: the law ${lawId} cannot be registered.`);
    return 1;
  }
  const index = readFileSync(indexFile, "utf8");
  if (!index.includes(`"${lawId}"`) && !index.includes(`${lawId},`) && !index.includes(`${lawId}:`)) {
    say(`The law ${lawId} is not registered in engines/${pack}/index.js: add the import and the entry, or it stays invisible.`);
    return 1;
  }
  return 0;
}

// REQ-15: a law module must not touch the DOM, or it cannot run in Node.
function checkLawDom(event) {
  const file = eventFile(event);
  if (!file || !file.endsWith(".js")) return 0;
  if (!file.includes("laws")) return 0;
  const source = readFileSync(file, "utf8");
  const forbidden = /\b(document|window|localStorage|requestAnimationFrame)\b/;
  const line = source.split("\n").findIndex((l) => forbidden.test(l) && !l.trim().startsWith("//"));
  if (line >= 0) {
    say(`${file}:${line + 1}: a law must stay DOM-free (REQ-15). Found: ${source.split("\n")[line].trim()}`);
    return 1;
  }
  return 0;
}

// A new lab folder must ship a config: a lab without one cannot boot.
function checkNewLab(event) {
  const file = eventFile(event);
  if (!file) return 0;
  const match = file.match(/app-[^\\/]+[\\/]index\.html$/);
  if (!match) return 0;
  const folder = file.slice(0, file.length - "index.html".length);
  const config = join(folder, "config.json");
  if (existsSync(config)) return 0;
  say(`This lab has no config.json: copy one from an existing lab and adapt it. Without it the lab cannot boot.`);
  return 1;
}

const MODE = process.argv[2];
const event = readEvent();
const modes = {
  "check-js": checkJs,
  "check-law": checkLawRegistration,
  "check-law-dom": checkLawDom,
  "check-new-lab": checkNewLab,
  "guard-commit": guardCommit,
  "session-context": sessionContext,
  "task-check": taskCheck,
  "stop-check": stopCheck,
};
const handler = modes[MODE];
if (!handler) {
  say(`unknown mode: ${MODE}`);
  process.exit(1);
}
process.exit(handler(event));
