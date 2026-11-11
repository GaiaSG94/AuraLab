// Workflow status file: tells a Kiro workflow repeat loop when the work is
// done. Run it after a fix attempt; it writes .kiro/workflow-output/status.json
// with { complete: boolean, failures: [...] }.
//
// Used as the stop condition of the "fix until green" workflow:
//   stopCondition: { fileCheck: { path: ".kiro/workflow-output/status.json",
//                                  jsonPath: "$.complete", value: true } }
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".kiro", "workflow-output", "status.json");

function run(args) {
  return spawnSync(process.execPath, args, { cwd: root, encoding: "utf8" });
}

const checks = [
  { name: "configs", args: ["scripts/validate-config.mjs"] },
  { name: "properties", args: ["tests/run-tests.mjs"] },
  { name: "mcp", args: ["mcp-server/smoke-test.mjs"] },
];

const failures = [];
for (const check of checks) {
  const result = run(check.args);
  if (result.status !== 0) {
    failures.push(`${check.name}: ${(result.stderr || result.stdout || "").trim().split("\n").slice(-6).join("\n")}`);
  }
}

const build = run(["scripts/build-standalone.mjs"]);
if (build.status !== 0) {
  failures.push(`build: ${(build.stderr || "").trim()}`);
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, `${JSON.stringify({ complete: failures.length === 0, failures }, null, 2)}\n`);

console.log(failures.length === 0 ? "complete" : `${failures.length} check(s) still failing`);
process.exit(failures.length === 0 ? 0 : 1);
