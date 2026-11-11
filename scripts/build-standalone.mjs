// Builds double-clickable standalone labs: dist/labkit-<lab>.html.
// Inlines styles + core + the lab's packs + lab wiring + config: no modules, no fetch.
// The 3D labs (app-ponts, app-chimie) also inline app-ponts/vendor/three.min.js (raw, no module stripping).
// Run: node scripts/build-standalone.mjs (re-run after editing core/, engines/ or configs).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Drop ESM import statements, including multi-line ones, and unwrap exports.
function stripModules(src, name) {
  const kept = dropImports(src.split("\n")).join("\n");
  if (/^\s*import\s/m.test(kept)) throw new Error(`${name}: unhandled import`);
  return kept
    .replace(/^(\s*)export\s+default\s+/gm, "$1")
    .replace(/^(\s*)export\s+(async\s+)?(function|const|let|class)\s+/gm, "$1$2$3 ");
}

// An import ends on the first line whose "outside-string" part closes the
// statement (a `;` or a closing quote after balanced braces).
function dropImports(lines) {
  const out = [];
  let i = 0;
  while (i < lines.length) {
    if (/^\s*import\b/.test(lines[i])) i = skipImport(lines, i);
    else {
      out.push(lines[i]);
      i += 1;
    }
  }
  return out;
}

function skipImport(lines, start) {
  let depth = 0;
  let i = start;
  while (i < lines.length) {
    const line = stripStrings(lines[i]);
    for (const ch of line) {
      if ("{[(".includes(ch)) depth += 1;
      if ("}])".includes(ch)) depth -= 1;
      if (depth <= 0 && ch === ";") return i + 1;
    }
    // A one-line import without a trailing `;`.
    if (depth <= 0 && /["']\s*$/.test(lines[i])) return i + 1;
    i += 1;
  }
  return i;
}

function stripStrings(line) {
  return line.replace(/(["'])(?:\\.|[^\\])*?\1/g, '""');
}

const CORE = [
  "core/catalog.js",
  "core/validate.js",
  "core/time.js",
  "core/controls.js",
  "core/strings.js",
  "core/headless.js",
  "core/instruments.js",
  "core/notebook.js",
  "core/ghost.js",
  "core/shell.js",
];
const PACKS = {
  particles: [
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
  ],
  chimie: [
    "engines/chimie/laws/dilution.js",
    "engines/chimie/laws/equilibre-acido-basique.js",
    "engines/chimie/laws/enthalpie-reaction.js",
    "engines/chimie/laws/precipitation.js",
    "engines/chimie/laws/degagement-gazeux.js",
    "engines/chimie/laws/indicateur-colore.js",
    "engines/chimie/laws/ebullition.js",
    "engines/chimie/world.js",
    "engines/chimie/index.js",
    "engines/chimie/narration.js",
    "engines/chimie/glassware.js",
    "engines/chimie/bench-ghost.js",
    "engines/chimie/hud-css.js",
    "engines/chimie/hud-shared.js",
    "engines/chimie/hud-left.js",
    "engines/chimie/benchview.js",
    "engines/chimie/hud.js",
  ],
  ponts: [
    "engines/ponts/materials.js",
    "engines/ponts/laws/chantier.js",
    "engines/ponts/laws/gravite.js",
    "engines/ponts/laws/rupture.js",
    "engines/ponts/laws/charge-flottante.js",
    "engines/ponts/laws/poids-propre.js",
    "engines/ponts/world.js",
    "engines/ponts/levels.js",
    "engines/ponts/sky.js",
    "engines/ponts/valley-dressing.js",
    "engines/ponts/site-statics.js",
    "engines/ponts/test-ghost.js",
    "engines/ponts/member-preview.js",
    "engines/ponts/hud-log.js",
    "engines/ponts/camera-rig.js",
    "engines/ponts/mapview.js",
  "engines/ponts/hud.js",
    "engines/ponts/index.js",
  ],
};
const PACK_VARS = { particles: "particlePack", chimie: "chimiePack", ponts: "pontsPack" };

function inline(rel) {
  return `// ---- ${rel} (inlined) ----\n` + stripModules(readFileSync(join(root, rel), "utf8"), rel);
}

const css = readFileSync(join(root, "core/styles.css"), "utf8");
const coreJs = CORE.map(inline).join("\n");
if (/^\s*export\s/m.test(coreJs)) throw new Error("unhandled export in core bundle");

function packJs(names) {
  const js = names.flatMap((n) => PACKS[n]).map(inline).join("\n");
  if (/^\s*export\s/m.test(js)) throw new Error("unhandled export in pack bundle");
  return js;
}

function page(title, configText, extraJs, labJs, packVars, mode) {
  const safe = configText.replace(/</g, "\\u003c");
  const safeTitle = String(title).replace(/</g, "");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='7' fill='%23f8fafc'/%3E%3Ccircle cx='5.5' cy='7' r='1.4' fill='%23111122'/%3E%3Ccircle cx='10.5' cy='7' r='1.4' fill='%23111122'/%3E%3C/svg%3E" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle} — LabKit (standalone)</title>
<style>
${css}
</style>
</head>
<body>
<div id="${mode === "game" ? "game" : "lab"}"><div class="boot-hint">Loading lab…<br />If this message stays, enable JavaScript or open this file in a recent browser.</div></div>
<script>
${coreJs}
${extraJs}
${labJs}
${mode === "game" ? `startGame(${safe});` : `boot(${safe}, buildLab, labManifest, [${packVars.join(", ")}]);`}
</script>
</body>
</html>
`;
}

const labs = [
  { dir: "app-space", out: "labkit-space.html", packs: ["particles"] },
  { dir: "app-eco", out: "labkit-eco.html", packs: ["particles"] },
  { dir: "app-chimie", out: "labkit-chimie.html", packs: ["chimie"], vendor: ["app-ponts/vendor/three.min.js"], mode: "game", main: "game.js" },
  { dir: "app-ponts", out: "labkit-ponts.html", packs: ["ponts"], vendor: ["app-ponts/vendor/three.min.js"], mode: "game", main: "game.js" },
];
mkdirSync(join(root, "dist"), { recursive: true });
for (const lab of labs) {
  const configText = readFileSync(join(root, lab.dir, "config.json"), "utf8");
  const config = JSON.parse(configText); // fail fast on invalid JSON
  const mainFile = lab.main || "lab.js";
  const labSrc = readFileSync(join(root, lab.dir, mainFile), "utf8");
  const labJs = `// ---- ${lab.dir}/${mainFile} (inlined) ----\n` + stripModules(labSrc, mainFile);
  let extraJs = packJs(lab.packs);
  for (const v of lab.vendor || []) {
    const raw = readFileSync(join(root, v), "utf8");
    if (/^\s*import[\s{]/m.test(raw)) throw new Error(`${v}: vendor must not use ESM imports`);
    extraJs += `\n// ---- ${v} (vendored, raw) ----\n` + raw + "\n";
  }
  const html = page(config.lab.title, configText, extraJs, labJs, lab.packs.map((p) => PACK_VARS[p]), lab.mode || "shell");
  const out = join(root, "dist", lab.out);
  writeFileSync(out, html);
  console.log(`OK ${out} (${html.length} bytes)`);
}
