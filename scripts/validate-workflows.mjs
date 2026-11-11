// Validate the Kiro workflow recipes in .kiro/workflows/.
// Mirrors the constraints Kiro's own `validate_workflow` tool reports:
// schema, unique node ids, step/depth caps, stop conditions, template vars.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, ".kiro", "workflows");

const MAX_STEPS = 50;
const MAX_DEPTH = 8;

const errors = [];
const warnings = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function warn(file, message) {
  warnings.push(`${file}: ${message}`);
}

// Collect every template variable used in a string.
function templates(text) {
  const found = [];
  const re = /\{\{([^}]+)\}\}/g;
  let m = re.exec(text);
  while (m) {
    found.push(m[1].trim());
    m = re.exec(text);
  }
  return found;
}

// Template forms (see the Kiro workflow authoring guide):
//   {{input}}             a launch input declared in `inputs`
//   {{previous.output}}   the last completed sibling in the same container
//   {{<id>.output}}       the captured output of an earlier step or watch
//   {{artifacts.<name>}}  the path registered by an earlier step
function checkTemplates(file, text, nodeId, context) {
  templates(text).forEach((t) => {
    const [head, ...rest] = t.split(".");
    const tail = rest.join(".");
    if (head === "previous") return;
    if (head === "artifacts") {
      if (!context.artifacts.has(tail)) {
        warn(file, `step "${nodeId}" reads {{${t}}} but no earlier step registers it`);
      }
      return;
    }
    if (tail === "output") {
      if (!context.steps.has(head)) {
        warn(file, `step "${nodeId}" reads {{${t}}} but no earlier step or watch produces it`);
      }
      return;
    }
    if (!context.inputs.has(t)) {
      warn(file, `step "${nodeId}" uses undeclared input {{${t}}}`);
    }
  });
}

function checkFile(name, recipe) {
  if (!recipe || typeof recipe !== "object") {
    fail(name, "the recipe must be an object");
    return;
  }
  if (!recipe.name) fail(name, "missing `name`");
  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    fail(name, "missing `steps`");
    return;
  }
  const ids = new Set();
  // Context of what the current container may read: producers seen so far.
  const context = {
    inputs: new Set(Object.keys(recipe.inputs || {})),
    steps: new Set(),
    artifacts: new Set(),
  };

  const walk = (nodes, depth) => {
    if (depth > MAX_DEPTH) {
      fail(name, `nesting deeper than ${MAX_DEPTH} levels`);
      return;
    }
    (nodes || []).forEach((node) => {
      if (!node || typeof node !== "object") {
        fail(name, "a node is not an object");
        return;
      }
      if (!node.id) {
        fail(name, "a node has no `id`");
        return;
      }
      if (ids.has(node.id)) fail(name, `duplicate node id "${node.id}"`);
      ids.add(node.id);

      if (node.type === "step") {
        if (!node.agent) fail(name, `step "${node.id}" has no \`agent\``);
        if (!node.prompt) fail(name, `step "${node.id}" has no \`prompt\``);
        checkTemplates(name, node.prompt || "", node.id, context);
        context.steps.add(node.id);
        if (node.artifacts) {
          Object.keys(node.artifacts).forEach((key) => context.artifacts.add(key));
        }
      } else if (node.type === "repeat") {
        if (!Number.isInteger(node.maxIterations) || node.maxIterations <= 0) {
          fail(name, `repeat "${node.id}" needs a finite maxIterations`);
        }
        if (!["abort", "continue", "pause"].includes(node.onMaxIterations)) {
          fail(name, `repeat "${node.id}" needs onMaxIterations: abort | continue | pause`);
        }
        if (node.stopCondition && node.stopWhen) {
          fail(name, `repeat "${node.id}" sets both stopCondition and stopWhen`);
        }
        checkStopCondition(name, node);
        walk(node.steps, depth + 1);
      } else if (node.type === "parallel") {
        if (!Array.isArray(node.branches) || node.branches.length === 0) {
          fail(name, `parallel "${node.id}" needs branches`);
        }
        if (!["all", "allSettled", "any"].includes(node.joinPolicy)) {
          fail(name, `parallel "${node.id}" needs joinPolicy: all | allSettled | any`);
        }
        // Branches are independent: each one starts from the parent's context.
        (node.branches || []).forEach((branch) => {
          walk(branch.steps || [], depth + 1);
        });
      } else if (node.type === "sequence") {
        walk(node.steps, depth + 1);
      } else if (node.type === "watch") {
        if (!node.handler) fail(name, `watch "${node.id}" has no \`handler\``);
        if (!node.config || !node.config.command) {
          warn(name, `watch "${node.id}" has no command handler to poll`);
        }
        context.steps.add(node.id);
      } else {
        fail(name, `unknown node type "${node.type}"`);
      }
    });
  };

  walk(recipe.steps, 1);
  if (ids.size > MAX_STEPS) fail(name, `${ids.size} steps exceeds the cap of ${MAX_STEPS}`);
}

function checkStopCondition(name, node) {
  const cond = node.stopCondition;
  if (!cond) return;
  if (cond.fileCheck) {
    const path = cond.fileCheck.jsonPath || "";
    // A leading `$.` is the document root and is allowed; a `$` after the
    // first segment is not.
    const segments = path.replace(/^\$\./, "").split(".");
    const bad =
      /[\[\]]/.test(path) ||
      path.includes("*") ||
      path.includes("..") ||
      segments.slice(1).some((s) => s.includes("$"));
    if (bad) {
      fail(name, `fileCheck jsonPath "${path}" uses an unsupported token`);
    }
  }
  if (cond.completionSignal && !["success", "need_input", "error"].includes(cond.completionSignal)) {
    fail(name, `unknown completionSignal "${cond.completionSignal}"`);
  }
}

let files = [];
try {
  files = readdirSync(dir).filter((f) => f.endsWith(".workflow.json") || f.endsWith(".workflow.yaml") || f.endsWith(".workflow.yml"));
} catch {
  fail(".kiro/workflows", "the directory does not exist");
}

for (const file of files) {
  const full = join(dir, file);
  if (file.endsWith(".json")) {
    let recipe;
    try {
      recipe = JSON.parse(readFileSync(full, "utf8"));
    } catch (err) {
      fail(file, `invalid JSON: ${err.message}`);
      continue;
    }
    checkFile(file, recipe);
  } else {
    warn(file, "YAML recipes are not parsed by this script; validate them with Kiro's validate_workflow");
  }
}

for (const w of warnings) console.log(`::warning::${w}`);
for (const e of errors) console.log(`::error::${e}`);
console.log(`${files.length} workflow(s) checked: ${errors.length} error(s), ${warnings.length} warning(s)`);
process.exit(errors.length === 0 ? 0 : 1);
