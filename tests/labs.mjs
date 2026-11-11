// Headless lab runner shared by the property tests and the MCP server.
// Boots a lab without a DOM: config -> validate -> world -> step -> measures.
// The catalog and lab discovery live in scripts/lab-registry.mjs (one source).
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { root, known, packs, listLabs, readConfig, catalog, validateConfig } from "../scripts/lab-registry.mjs";

export { root, known, packs, listLabs, readConfig };

// Boot a lab headlessly. Returns { config, lab, isActive, setActive, warnings, errors }.
export async function bootLab(lab) {
  const raw = readConfig(lab);
  const { config, warnings, errors } = validateConfig(raw, known);
  if (!config) throw new Error(`${lab}: invalid config:\n- ${errors.join("\n- ")}`);
  const mod = await import(pathToFileURL(join(root, lab, "lab.js")).href);
  const active = {};
  const key = (cat, id) => `${cat}:${id}`;
  (config.substances || []).forEach((s) => { active[key("substances", s.id)] = s.active; });
  (config.material || []).forEach((m) => { active[key("material", m.id)] = m.active; });
  (config.laws || []).forEach((l, i) => { active[key("laws", `${l.law}#${i}`)] = l.active; });
  const isActive = (cat, id) => active[key(cat, id)] !== false;
  const setActive = (cat, id, v) => { active[key(cat, id)] = v; };
  const built = mod.buildLab({ catalog, isActive, params: config }, config);
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
