// LabKit catalog + lab registry: the data the MCP tools answer with.
// Kept separate from the protocol layer so the server stays readable.
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

export function knownCatalog() {
  const known = {
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
  return known;
}

export function listLabFolders() {
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith("app-"))
    .map((d) => d.name)
    .sort();
}

// The manifest of a lab: lab.js for the shell labs, game.js for the custom-UI ones.
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
  const known = knownCatalog();
  const manifest = await loadManifest(lab);
  known.measures = [...known.measures, ...(manifest.measures || []).map((m) => m.id)];
  return known;
}

export function readConfig(lab) {
  return JSON.parse(readFileSync(join(root, lab, "config.json"), "utf8"));
}

// Which pack does a lab use? Read from the packs whose laws the config cites.
export function packOf(config) {
  const laws = new Set((config.laws || []).map((l) => l.law));
  const owners = packs
    .filter((p) => Object.keys(p.laws).some((id) => laws.has(id)))
    .map((p) => p.id);
  return owners.length > 0 ? owners.join(", ") : "particles";
}

export { validateConfig };
