// Validates every lab config in this repo against the unified catalog.
// Run: node scripts/validate-config.mjs
// Wire it as a Kiro post-save Agent Hook (see .kiro/hooks/README.md).
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateConfig } from "../core/validate.js";
import { builtinInstruments } from "../core/catalog.js";
import { particlePack } from "../engines/particles/index.js";
import { chimiePack } from "../engines/chimie/index.js";
import { pontsPack } from "../engines/ponts/index.js";

const packs = [particlePack, chimiePack, pontsPack];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const apps = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("app-"))
  .map((d) => d.name);

let failed = 0;
for (const dir of apps) {
  const file = join(root, dir, "config.json");
  let raw;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    console.error(`FAIL ${file}: invalid JSON (${err.message})`);
    failed += 1;
    continue;
  }
  let labManifest = { measures: [] };
  try {
    const lab = await import(pathToFileURL(join(root, dir, "lab.js")).href);
    labManifest = lab.labManifest || labManifest;
  } catch (err) {
    try {
      const game = await import(pathToFileURL(join(root, dir, "game.js")).href);
      labManifest = game.gameManifest || labManifest;
    } catch (err2) {
      console.error(`FAIL ${dir}/lab.js: cannot load (${err.message})`);
      failed += 1;
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
  if (!config) {
    console.error(`FAIL ${file}:`);
    for (const e of errors) console.error(`  - ${e}`);
    failed += 1;
  } else {
    console.log(`OK ${file}`);
    for (const w of warnings) console.log(`  warning: ${w}`);
  }
}
if (apps.length === 0) {
  console.error("FAIL: no app-*/config.json found");
  process.exit(1);
}
process.exit(failed === 0 ? 0 : 1);
