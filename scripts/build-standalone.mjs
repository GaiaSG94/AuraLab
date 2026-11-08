// Builds double-clickable standalone labs: dist/aura-space.html, dist/aura-eco.html.
// Inlines styles + core + engines + lab wiring + config: no modules, no fetch.
// Run: node scripts/build-standalone.mjs (re-run after editing core/, engines/ or configs).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function stripModules(src, name) {
  const kept = src
    .split("\n")
    .filter((line) => !/^\s*import\s/.test(line))
    .join("\n");
  if (/^\s*import\s/m.test(kept)) throw new Error(`${name}: unhandled import`);
  return kept
    .replace(/^(\s*)export\s+default\s+/gm, "$1")
    .replace(/^(\s*)export\s+(async\s+)?(function|const|let|class)\s+/gm, "$1$2$3 ");
}

const CORE = [
  "core/catalog.js",
  "core/validate.js",
  "core/time.js",
  "core/controls.js",
  "core/instruments.js",
  "core/notebook.js",
  "core/shell.js",
];
const PACK = [
  "engines/particles/laws/gravitation.js",
  "engines/particles/laws/placement-circulaire.js",
  "engines/particles/laws/errance.js",
  "engines/particles/laws/derive.js",
  "engines/particles/laws/poursuite.js",
  "engines/particles/laws/fuite.js",
  "engines/particles/laws/predation.js",
  "engines/particles/laws/reproduction.js",
  "engines/particles/world.js",
  "engines/particles/index.js",
];

const css = readFileSync(join(root, "core/styles.css"), "utf8");
const shared = [...CORE, ...PACK]
  .map((f) => `// ---- ${f} (inlined) ----\n` + stripModules(readFileSync(join(root, f), "utf8"), f))
  .join("\n");
if (/^\s*export\s/m.test(shared)) throw new Error("unhandled export in shared bundle");

function page(title, configText, labJs) {
  const safe = configText.replace(/</g, "\\u003c");
  const safeTitle = String(title).replace(/</g, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle} — AuraLab (standalone)</title>
<style>
${css}
</style>
</head>
<body>
<div id="lab"><div class="boot-hint">Loading lab…<br />If this message stays, enable JavaScript or open this file in a recent browser.</div></div>
<script>
${shared}
${labJs}
boot(${safe}, buildLab, labManifest, [particlePack]);
</script>
</body>
</html>
`;
}

const labs = [
  { dir: "app-space", out: "aura-space.html" },
  { dir: "app-eco", out: "aura-eco.html" },
];
mkdirSync(join(root, "dist"), { recursive: true });
for (const lab of labs) {
  const configText = readFileSync(join(root, lab.dir, "config.json"), "utf8");
  const config = JSON.parse(configText); // fail fast on invalid JSON
  const labSrc = readFileSync(join(root, lab.dir, "lab.js"), "utf8");
  const labJs = `// ---- ${lab.dir}/lab.js (inlined) ----\n` + stripModules(labSrc, "lab.js");
  const html = page(config.lab.title, configText, labJs);
  const out = join(root, "dist", lab.out);
  writeFileSync(out, html);
  console.log(`OK ${out} (${html.length} bytes)`);
}
