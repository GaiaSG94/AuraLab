// LabKit lab registry — the single place that knows which labs exist, which
// packs they use, and what the merged catalog accepts.
//
// Build-time tooling only (scripts, tests, MCP server). It never ships in a
// lab: `core/` stays generic and knows no lab.
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateConfig } from "../core/validate.js";
import { builtinInstruments } from "../core/catalog.js";
import { particlePack } from "../engines/particles/index.js";
import { chimiePack } from "../engines/chimie/index.js";
import { pontsPack } from "../engines/ponts/index.js";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");

export const packs = [particlePack, chimiePack, pontsPack];

export const known = {
  laws: {},
  apparatus: packs.flatMap((p) => Object.keys(p.apparatus)),
  instruments: Object.keys(builtinInstruments),
  measures: packs.flatMap((p) => p.measures.map((m) => m.id)),
  surfaces: ["stage", "webgl"],
};
packs.forEach((pack) => {
  Object.keys(pack.laws).forEach((id) => {
    known.laws[id] = { defaults: pack.laws[id].defaults || {} };
  });
});

export const catalog = { laws: {}, apparatus: {} };
packs.forEach((pack) => {
  Object.assign(catalog.laws, pack.laws || {});
  Object.assign(catalog.apparatus, pack.apparatus || {});
});

export function listLabs() {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("app-"))
    .map((d) => d.name)
    .sort();
}

export function readConfig(lab) {
  return JSON.parse(readFileSync(join(root, lab, "config.json"), "utf8"));
}

// A lab declares its extra measures in lab.js (shell labs) or game.js
// (custom-UI labs). lab.js wins: it is the DOM-free wiring.
export async function loadManifest(lab) {
  for (const file of ["lab.js", "game.js"]) {
    try {
      const mod = await import(pathToFileURL(join(root, lab, file)).href);
      return mod.labManifest || mod.gameManifest || { measures: [] };
    } catch (err) {
      if (file === "game.js") throw err;
    }
  }
  return { measures: [] };
}

export async function knownForLab(lab) {
  const manifest = await loadManifest(lab);
  return {
    ...known,
    measures: [...known.measures, ...(manifest.measures || []).map((m) => m.id)],
  };
}

// Which pack a lab uses, read from the laws its config cites.
export function packOf(config) {
  const laws = new Set((config.laws || []).map((l) => l.law));
  const owners = packs.filter((p) => Object.keys(p.laws).some((id) => laws.has(id))).map((p) => p.id);
  return owners.length > 0 ? owners.join(", ") : "particles";
}

export { validateConfig };
