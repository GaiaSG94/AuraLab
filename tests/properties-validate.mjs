// Property-based tests for the config validator (core/validate.js).
//
// Every property is written as an implication: "IF the premise holds, THEN
// ...". That matters for shrinking: a shrinker that removes the premise must
// leave the property trivially true, never falsely failing.
//
// Each property names the EARS requirement it checks
// (.kiro/specs/visual-lab/requirements.md).
import { validateConfig } from "../core/validate.js";
import { builtinInstruments } from "../core/catalog.js";
import { particlePack } from "../engines/particles/index.js";
import { chimiePack } from "../engines/chimie/index.js";
import { pontsPack } from "../engines/ponts/index.js";
import { Suite } from "./harness.mjs";

const packs = [particlePack, chimiePack, pontsPack];

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

export function baseConfig() {
  return {
    lab: { id: "pbt", title: "PBT Lab", subtitle: "", accent: "#ffb454" },
    bench: { background: "#07090c", trail: 0.25, speckles: 0 },
    bounds: "wrap",
    substances: [
      { id: "a", label: "A", count: 10, color: "#9ad1ff", radius: 3, mass: 1, speed: 40 },
      { id: "b", label: "B", count: 5, color: "#e8e6e1", radius: 3, mass: 1, speed: 40 },
    ],
    material: [
      { id: "star", kind: "attractor", label: "Star", x: 0.5, y: 0.5, strength: 100, radius: 20, color: "#ffffff" },
    ],
    laws: [{ law: "gravitation" }],
    metrics: [{ id: "m", label: "M", unit: "", source: "counts.a" }],
    instruments: [{ type: "chips", metrics: ["m"] }],
    controls: [{ path: "substances.a.count", label: "A", min: 0, max: 100, step: 1 }],
    notebook: { enabled: true, prompts: [] },
  };
}

const JUNK_NUMBERS = [NaN, Infinity, -Infinity, -1, 1e12, 0.5, "12", null, undefined, {}];

function walkNumbers(value, visit, path = "") {
  if (value === null || typeof value !== "object") return;
  Object.keys(value).forEach((key) => {
    const child = value[key];
    const next = path ? `${path}.${key}` : key;
    if (typeof child === "number") visit(child, next);
    else walkNumbers(child, visit, next);
  });
}

// --- premises, read back from the config so shrinking keeps them consistent ---

function substanceIds(config) {
  return new Set((config.substances || []).map((s) => s && s.id).filter(Boolean));
}

function metricIds(config) {
  return new Set((config.metrics || []).map((m) => m && m.id).filter(Boolean));
}

// The first dangling catalog reference of the config, or null.
export function danglingReference(config) {
  const subs = substanceIds(config);
  const mets = metricIds(config);
  for (const law of config.laws || []) {
    if (law && law.law && !known.laws[law.law]) return law.law;
  }
  for (const mat of config.material || []) {
    if (mat && mat.kind && !known.apparatus.includes(mat.kind)) return mat.kind;
  }
  for (const metric of config.metrics || []) {
    if (!metric || typeof metric.source !== "string") continue;
    if (metric.source.startsWith("counts.")) {
      const id = metric.source.slice(7);
      if (!subs.has(id)) return metric.source;
    } else if (!known.measures.includes(metric.source)) {
      return metric.source;
    }
  }
  for (const ins of config.instruments || []) {
    if (!ins) continue;
    if (ins.type && !known.instruments.includes(ins.type)) return ins.type;
    for (const id of ins.metrics || []) {
      if (id && !mets.has(id)) return id;
    }
  }
  return null;
}

// The first substance id a law points at but that does not exist, or null.
export function danglingTarget(config) {
  const subs = substanceIds(config);
  for (const law of config.laws || []) {
    if (!law) continue;
    for (const target of law.targets || []) {
      if (target && !subs.has(target)) return target;
    }
    for (const pair of (law.params && law.params.pairs) || []) {
      if (!Array.isArray(pair)) continue;
      for (const id of pair) {
        if (id && !subs.has(id)) return id;
      }
    }
  }
  return null;
}

function declaredTotal(config) {
  return (config.substances || []).reduce((t, s) => t + (s && typeof s.count === "number" ? s.count : 0), 0);
}

export const suite = new Suite("validate");

// REQ-03: a non-finite or out-of-range number is clamped or reset, never a crash.
suite.property(
  "REQ-03 numeric junk is auto-tuned, never fatal",
  (rng) => {
    const config = baseConfig();
    config.substances[0].count = JUNK_NUMBERS[Math.floor(rng() * JUNK_NUMBERS.length)];
    config.substances[1].mass = JUNK_NUMBERS[Math.floor(rng() * JUNK_NUMBERS.length)];
    config.material[0].strength = JUNK_NUMBERS[Math.floor(rng() * JUNK_NUMBERS.length)];
    config.bench.trail = JUNK_NUMBERS[Math.floor(rng() * JUNK_NUMBERS.length)];
    return config;
  },
  (config) => {
    const { config: out, errors } = validateConfig(config, known);
    if (out === null) {
      if (errors.length === 0) throw new Error("refused without an error message");
      return;
    }
    walkNumbers(out, (n, path) => {
      if (!Number.isFinite(n)) throw new Error(`non-finite number survived at ${path}: ${n}`);
    });
  },
  { runs: 60 },
);

// REQ-02: a structurally wrong config is refused, never silently accepted.
suite.property(
  "REQ-02 broken configs are refused with a message",
  (rng) => {
    const broken = [null, [], "text", 42];
    return broken[Math.floor(rng() * broken.length)];
  },
  (value) => {
    const { config, errors } = validateConfig(value, known);
    if (config === null && errors.length === 0) throw new Error("refused without an error message");
  },
  { runs: 20 },
);

// REQ-04: a dangling catalog reference is refused and named in the error.
suite.property(
  "REQ-04 unknown references are named in the error",
  (rng) => {
    const config = baseConfig();
    const unknown = `ghost-${Math.floor(rng() * 1000)}`;
    const target = Math.floor(rng() * 4);
    if (target === 0) config.laws.push({ law: unknown });
    if (target === 1) config.material.push({ id: unknown, kind: unknown, label: "X" });
    if (target === 2) config.metrics.push({ id: unknown, label: "X", unit: "", source: unknown });
    if (target === 3) config.instruments.push({ type: unknown, metrics: ["m"] });
    return config;
  },
  (config) => {
    const dangling = danglingReference(config);
    if (dangling === null) return; // premise gone: nothing to check
    const { config: out, errors } = validateConfig(config, known);
    if (out !== null) throw new Error(`unknown reference "${dangling}" was accepted`);
    if (!errors.some((e) => e.includes(dangling))) {
      throw new Error(`error does not name "${dangling}": ${errors.join(" | ")}`);
    }
  },
  { runs: 40 },
);

// REQ-05: the particle cap is a hard refusal.
suite.property(
  "REQ-05 a config above the particle cap is refused",
  (rng) => {
    const config = baseConfig();
    config.substances[0].count = 800;
    config.substances[1].count = 701 + Math.floor(rng() * 100);
    return config;
  },
  (config) => {
    if (declaredTotal(config) <= 1500) return; // premise gone
    const { config: out, errors } = validateConfig(config, known);
    if (out !== null) throw new Error("a config above the particle cap was accepted");
    if (!errors.some((e) => e.includes("1500"))) throw new Error(`cap error missing: ${errors.join(" | ")}`);
  },
  { runs: 10 },
);

// REQ-22: an instrument may only display metrics the lab declares.
suite.property(
  "REQ-22 instruments only display declared metrics",
  (rng) => {
    const config = baseConfig();
    config.instruments.push({ type: "chips", metrics: [`metric-${Math.floor(rng() * 1000)}`] });
    return config;
  },
  (config) => {
    const dangling = danglingReference(config);
    if (dangling === null) return;
    const { config: out, errors } = validateConfig(config, known);
    if (out !== null) throw new Error("a dangling metric reference was accepted");
    if (!errors.some((e) => e.includes(dangling))) {
      throw new Error(`error does not name "${dangling}": ${errors.join(" | ")}`);
    }
  },
  { runs: 30 },
);

// REQ-10: a law only targets substances that exist.
suite.property(
  "REQ-10 law targets and pairs reference existing substances",
  (rng) => {
    const config = baseConfig();
    const ghost = `ghost-${Math.floor(rng() * 1000)}`;
    if (Math.floor(rng() * 2) === 0) config.laws.push({ law: "gravitation", targets: [ghost] });
    else config.laws.push({ law: "predation", params: { pairs: [["a", ghost]] } });
    return config;
  },
  (config) => {
    const ghost = danglingTarget(config);
    if (ghost === null) return; // premise gone
    const { config: out, errors } = validateConfig(config, known);
    if (out !== null) throw new Error("a dangling law target was accepted");
    if (!errors.some((e) => e.includes(ghost))) {
      throw new Error(`error does not name "${ghost}": ${errors.join(" | ")}`);
    }
  },
  { runs: 30 },
);

// REQ-23: a control points at a numeric value that exists.
suite.property(
  "REQ-23 controls point at existing numeric values",
  (rng) => {
    const config = baseConfig();
    config.controls.push({
      path: `substances.ghost-${Math.floor(rng() * 1000)}.count`,
      label: "X",
      min: 0,
      max: 10,
      step: 1,
    });
    return config;
  },
  (config) => {
    const bad = (config.controls || []).find((c) => c && typeof c.path === "string" && c.path.includes("ghost-"));
    if (!bad) return; // premise gone
    const { config: out, errors } = validateConfig(config, known);
    if (out !== null) throw new Error("a control pointing nowhere was accepted");
    if (!errors.some((e) => e.includes("controls."))) {
      throw new Error(`no control error reported: ${errors.join(" | ")}`);
    }
  },
  { runs: 30 },
);
