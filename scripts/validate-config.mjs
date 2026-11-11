// Validates every lab config in this repo against the unified catalog.
// Run: node scripts/validate-config.mjs
// Wired as a Kiro PostFileSave hook and as the CI `lint` job.
import { join } from "node:path";
import { listLabs, readConfig, knownForLab, validateConfig } from "./lab-registry.mjs";

const apps = listLabs();
let failed = 0;

for (const dir of apps) {
  const file = join(dir, "config.json");
  let raw;
  try {
    raw = readConfig(dir);
  } catch (err) {
    console.error(`FAIL ${file}: invalid JSON (${err.message})`);
    failed += 1;
    continue;
  }
  let known;
  try {
    known = await knownForLab(dir);
  } catch (err) {
    console.error(`FAIL ${dir}/lab.js: cannot load (${err.message})`);
    failed += 1;
    continue;
  }
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
