// Headless lab runner shared by the property tests and the MCP server.
// Boots a lab without a DOM: config -> validate -> world -> step -> measures.
import { readFileSync } from "node:fs";
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

export function listLabs() {
  return ["app-space", "app-eco", "app-chimie", "app-ponts"];
}

export function readConfig(lab) {
  return JSON.parse(readFileSync(join(root, lab, "config.json"), "utf8"));
}

// Boot a lab headlessly. Returns { config, lab, isActive, setActive, warnings, errors }.
export async function bootLab(lab) {
  const raw = readConfig(lab);
  const { config, warnings, errors } = validateConfig(raw, known);
  if (!config) throw new Error(`${lab}: invalid config:\n- ${errors.join("\n- ")}`);
  const catalog = { laws: {}, apparatus: {} };
  packs.forEach((pack) => {
    Object.assign(catalog.laws, pack.laws || {});
    Object.assign(catalog.apparatus, pack.apparatus || {});
  });
  const mod = await import(pathToFileURL(join(root, lab, "lab.js")).href);
  const active = {};
  const key = (cat, id) => `${cat}:${id}`;
  (config.substances || []).forEach((s) => { active[key("substances", s.id)] = s.active; });
  (config.material || []).forEach((m) => { active[key("material", m.id)] = m.active; });
  (config.laws || []).forEach((l, i) => { active[key("laws", `${l.law}#${i}`)] = l.active; });
  const isActive = (cat, id) => active[key(cat, id)] !== false;
  const setActive = (cat, id, v) => { active[key(cat, id)] = v; };
  const api = { catalog, isActive, params: config };
  const built = mod.buildLab(api, config);
  return { config, lab: built, isActive, setActive, warnings, errors };
}

// Step a booted lab for `steps` frames of 1/60 s and return the measures.
export function runSteps(booted, steps, dt = 1 / 60) {
  for (let i = 0; i < steps; i++) booted.lab.step(dt, booted.isActive);
  return booted.lab.measures();
}

export function measuresAreFinite(measures) {
  return Object.values(measures).every((v) => typeof v !== "number" || Number.isFinite(v));
}
