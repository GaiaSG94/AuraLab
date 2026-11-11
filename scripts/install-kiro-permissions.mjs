// Install the workspace permissions for this repo.
// Kiro stores them per user, outside the repository:
//   ~/.kiro/workspace-roots/<hash>/permissions.yaml
// The hash is chosen by Kiro when the folder is opened, so this script finds
// the right folder by matching the workspace root it recorded.
//
// Run: node scripts/install-kiro-permissions.mjs
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(join(dirname(fileURLToPath(import.meta.url)), ".."));
const rootsDir = join(homedir(), ".kiro", "workspace-roots");
const model = join(root, ".kiro", "settings", "permissions.example.yaml");

if (!existsSync(rootsDir)) {
  console.error(`No Kiro workspace folder yet (${rootsDir}).`);
  console.error("Open this repo in Kiro once, then run this script again.");
  process.exit(1);
}
if (!existsSync(model)) {
  console.error(`Missing the permissions model: ${model}`);
  process.exit(1);
}

const wanted = root.toLowerCase().replace(/\\/g, "/");
let target = null;
for (const entry of readdirSync(rootsDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const marker = join(rootsDir, entry.name, ".trust-migration.json");
  if (!existsSync(marker)) continue;
  try {
    const data = JSON.parse(readFileSync(marker, "utf8"));
    const recorded = String(data.root || "").toLowerCase().replace(/\\/g, "/");
    if (recorded === wanted) {
      target = join(rootsDir, entry.name, "permissions.yaml");
      break;
    }
  } catch {
    /* an unreadable marker simply does not match */
  }
}

if (!target) {
  console.error(`Kiro has no workspace entry for ${root}.`);
  console.error("Open this folder in Kiro once (it asks whether to trust the workspace), then run this script again.");
  process.exit(1);
}

const body = readFileSync(model, "utf8")
  .split("\n")
  .filter((line) => !line.startsWith("#"))
  .join("\n")
  .trim();
writeFileSync(target, `${body}\n`);
console.log(`Permissions written to ${target}`);
console.log("Restart the Kiro session (or reload the window) for them to apply.");
