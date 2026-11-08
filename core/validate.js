// AuraLab core — config validation + auto-tuning (shared by browser and Node).
// Invalid numbers are clamped with a warning; only structural problems are errors.
// known = { laws: {id: {defaults}}, apparatus: [kinds], instruments: [types],
//           measures: [ids], surfaces: [names] }

const HEX_COLOR = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const BOUNDS = new Set(["wrap", "bounce"]);
const MAX_PARTICLES = 1500;
const MAX_SUBSTANCES = 8;

export function getPath(obj, path) {
  let cur = obj;
  for (const seg of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = cur[seg];
  }
  return cur;
}

export function setPath(obj, path, value) {
  const segs = path.split(".");
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    cur = cur[segs[i]];
    if (cur === null || typeof cur !== "object") return false;
  }
  const leaf = segs[segs.length - 1];
  if (typeof cur[leaf] !== "number") return false;
  cur[leaf] = value;
  return true;
}

function isFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v);
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

/**
 * @param {unknown} raw parsed JSON
 * @param {object} known catalog references (law ids, apparatus kinds, ...)
 * @returns {{ config: object|null, warnings: string[], errors: string[] }}
 */
export function validateConfig(raw, known) {
  const warnings = [];
  const errors = [];
  const fix = (msg) => warnings.push(msg);
  known = known || { laws: {}, apparatus: [], instruments: [], measures: [], surfaces: [] };

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { config: null, warnings, errors: ["config root must be an object"] };
  }
  const config = JSON.parse(JSON.stringify(raw));

  // --- lab ---
  if (config.lab === null || typeof config.lab !== "object") {
    errors.push("lab: missing object with title/subtitle/accent");
  } else {
    if (typeof config.lab.title !== "string" || !config.lab.title.trim()) {
      errors.push("lab.title: required non-empty string");
    }
    if (typeof config.lab.id !== "string" || !config.lab.id.trim()) {
      errors.push("lab.id: required non-empty string (used for notebook storage)");
    }
    if (typeof config.lab.subtitle !== "string") config.lab.subtitle = "";
    if (typeof config.lab.accent !== "string" || !HEX_COLOR.test(config.lab.accent)) {
      errors.push("lab.accent: required hex color like #ffb454");
    }
    if (typeof config.lab.note !== "string") config.lab.note = "";
  }

  // --- bench ---
  config.bench = config.bench && typeof config.bench === "object" ? config.bench : {};
  if (typeof config.bench.background !== "string") config.bench.background = "#07090c";
  if (!isFiniteNumber(config.bench.trail)) {
    config.bench.trail = 0.25;
    fix("bench.trail reset to 0.25 (must be a finite number)");
  } else if (config.bench.trail < 0.05 || config.bench.trail > 1) {
    config.bench.trail = clamp(config.bench.trail, 0.05, 1);
    fix(`bench.trail clamped to ${config.bench.trail}`);
  }
  if (!isFiniteNumber(config.bench.speckles)) {
    config.bench.speckles = 0;
  } else {
    config.bench.speckles = Math.round(clamp(config.bench.speckles, 0, 600));
  }

  // --- bounds ---
  if (!BOUNDS.has(config.bounds)) {
    config.bounds = "wrap";
    fix('bounds reset to "wrap"');
  }

  // --- substances ---
  if (!Array.isArray(config.substances)) config.substances = [];
  if (config.substances.length > MAX_SUBSTANCES) {
    config.substances.length = MAX_SUBSTANCES;
    fix(`substances truncated to ${MAX_SUBSTANCES}`);
  }
  const subIds = new Set();
  let total = 0;
  config.substances.forEach((s, i) => {
    if (s === null || typeof s !== "object") {
      errors.push(`substances.${i}: must be an object`);
      return;
    }
    if (typeof s.id !== "string" || !s.id.trim()) {
      errors.push(`substances.${i}.id: required non-empty string`);
      s.id = `substance-${i}`;
    }
    if (subIds.has(s.id)) errors.push(`substances.${i}.id: duplicate id "${s.id}"`);
    subIds.add(s.id);
    if (typeof s.label !== "string") s.label = s.id;
    if (!isFiniteNumber(s.count)) {
      s.count = 0;
      fix(`substances.${i}.count reset to 0`);
    } else {
      const clamped = Math.round(clamp(s.count, 0, 800));
      if (clamped !== s.count) fix(`substances.${i}.count clamped to ${clamped}`);
      s.count = clamped;
    }
    total += s.count;
    if (typeof s.color !== "string" || !HEX_COLOR.test(s.color)) {
      s.color = "#9ad1ff";
      fix(`substances.${i}.color reset to #9ad1ff`);
    }
    if (!isFiniteNumber(s.radius) || s.radius <= 0) {
      s.radius = 3;
      fix(`substances.${i}.radius reset to 3`);
    } else {
      s.radius = clamp(s.radius, 0.5, 30);
    }
    if (!isFiniteNumber(s.mass) || s.mass <= 0) {
      s.mass = 1;
      fix(`substances.${i}.mass reset to 1`);
    } else {
      s.mass = clamp(s.mass, 0.1, 100);
    }
    if (!isFiniteNumber(s.speed)) s.speed = 60;
    else s.speed = clamp(s.speed, 0, 600);
    if (s.ring !== undefined) {
      if (!Array.isArray(s.ring) || s.ring.length !== 2 || !s.ring.every(isFiniteNumber)) {
        s.ring = [0.15, 0.42];
        fix(`substances.${i}.ring reset to [0.15, 0.42]`);
      }
    }
    if (s.links !== undefined && s.links !== null && typeof s.links !== "object") {
      s.links = null;
      fix(`substances.${i}.links reset to null`);
    }
    if (s.links && !isFiniteNumber(s.links.distance)) {
      s.links.distance = 80;
      fix(`substances.${i}.links.distance reset to 80`);
    }
    if (typeof s.active !== "boolean") s.active = true;
  });
  if (total > MAX_PARTICLES) {
    errors.push(`total particles ${total} exceeds cap ${MAX_PARTICLES}`);
  }

  // --- material (apparatus) ---
  if (!Array.isArray(config.material)) config.material = [];
  const matIds = new Set();
  config.material.forEach((m, i) => {
    if (m === null || typeof m !== "object") {
      errors.push(`material.${i}: must be an object`);
      return;
    }
    if (typeof m.id !== "string" || !m.id.trim()) {
      errors.push(`material.${i}.id: required non-empty string`);
      m.id = `material-${i}`;
    }
    if (matIds.has(m.id)) errors.push(`material.${i}.id: duplicate id "${m.id}"`);
    matIds.add(m.id);
    if (typeof m.label !== "string") m.label = m.id;
    if (!known.apparatus.includes(m.kind)) {
      errors.push(`material.${i}.kind: unknown apparatus "${m.kind}" (known: ${known.apparatus.join(", ") || "none"})`);
    }
    for (const k of ["x", "y"]) {
      if (m[k] === undefined) continue;
      if (!isFiniteNumber(m[k])) {
        m[k] = 0.5;
        fix(`material.${i}.${k} reset to 0.5`);
      } else {
        m[k] = clamp(m[k], 0, 1);
      }
    }
    if (m.strength !== undefined) {
      if (!isFiniteNumber(m.strength)) {
        m.strength = 0;
        fix(`material.${i}.strength reset to 0`);
      } else if (m.strength < -5000 || m.strength > 5000) {
        m.strength = clamp(m.strength, -5000, 5000);
        fix(`material.${i}.strength clamped to ${m.strength}`);
      }
    }
    if (m.radius !== undefined && (!isFiniteNumber(m.radius) || m.radius <= 0)) {
      m.radius = 20;
      fix(`material.${i}.radius reset to 20`);
    }
    if (m.color !== undefined && (typeof m.color !== "string" || !HEX_COLOR.test(m.color))) {
      m.color = "#ffffff";
      fix(`material.${i}.color reset to #ffffff`);
    }
    if (typeof m.active !== "boolean") m.active = true;
  });

  // --- laws ---
  if (!Array.isArray(config.laws)) config.laws = [];
  config.laws.forEach((l, i) => {
    if (l === null || typeof l !== "object") {
      errors.push(`laws.${i}: must be an object`);
      return;
    }
    if (!known.laws[l.law]) {
      errors.push(`laws.${i}.law: unknown law "${l.law}" (known: ${Object.keys(known.laws).join(", ") || "none"})`);
      return;
    }
    if (l.targets !== undefined) {
      if (!Array.isArray(l.targets)) {
        errors.push(`laws.${i}.targets: must be an array of substance ids`);
      } else {
        l.targets.forEach((t) => {
          if (!subIds.has(t)) errors.push(`laws.${i}.targets: unknown substance "${t}"`);
        });
      }
    }
    if (l.params !== undefined && (l.params === null || typeof l.params !== "object")) {
      errors.push(`laws.${i}.params: must be an object`);
    }
    // pair references (hunt/flee/predation style laws) must name existing substances
    const pairs = l.params && l.params.pairs;
    if (pairs !== undefined) {
      if (!Array.isArray(pairs)) {
        errors.push(`laws.${i}.params.pairs: must be an array of [a, b] substance pairs`);
      } else {
        pairs.forEach((p) => {
          if (!Array.isArray(p) || p.length !== 2 || !subIds.has(p[0]) || !subIds.has(p[1])) {
            errors.push(`laws.${i}.params.pairs: each pair must be two existing substance ids`);
          }
        });
      }
    }
    if (typeof l.active !== "boolean") l.active = true;
  });

  // --- metrics ---
  if (!Array.isArray(config.metrics)) config.metrics = [];
  const metricIds = new Set();
  config.metrics.forEach((m, i) => {
    if (m === null || typeof m !== "object") {
      errors.push(`metrics.${i}: must be an object`);
      return;
    }
    if (typeof m.id !== "string" || !m.id.trim()) {
      errors.push(`metrics.${i}.id: required non-empty string`);
      m.id = `metric-${i}`;
    }
    if (metricIds.has(m.id)) errors.push(`metrics.${i}.id: duplicate id "${m.id}"`);
    metricIds.add(m.id);
    if (typeof m.label !== "string") m.label = m.id;
    if (typeof m.unit !== "string") m.unit = "";
    if (typeof m.source !== "string") {
      errors.push(`metrics.${i}.source: required string (counts.<substance> or a lab measure)`);
    } else if (m.source.startsWith("counts.")) {
      if (!subIds.has(m.source.slice(7))) errors.push(`metrics.${i}.source: unknown substance in "${m.source}"`);
    } else if (!known.measures.includes(m.source)) {
      errors.push(`metrics.${i}.source: unknown measure "${m.source}" (known: counts.<substance>, ${known.measures.join(", ") || "none"})`);
    }
    if (typeof m.color !== "string" || !HEX_COLOR.test(m.color)) {
      m.color = "#e8e6e1";
      fix(`metrics.${i}.color reset to #e8e6e1`);
    }
  });

  // --- instruments ---
  if (!Array.isArray(config.instruments)) config.instruments = [];
  config.instruments.forEach((ins, i) => {
    if (ins === null || typeof ins !== "object") {
      errors.push(`instruments.${i}: must be an object`);
      return;
    }
    if (!known.instruments.includes(ins.type)) {
      errors.push(`instruments.${i}.type: unknown instrument "${ins.type}" (known: ${known.instruments.join(", ") || "none"})`);
    }
    if (typeof ins.title !== "string") ins.title = "";
    if (!Array.isArray(ins.metrics)) {
      errors.push(`instruments.${i}.metrics: required array of metric ids`);
      ins.metrics = [];
    } else {
      ins.metrics.forEach((id) => {
        if (!metricIds.has(id)) errors.push(`instruments.${i}.metrics: unknown metric "${id}"`);
      });
    }
    if (ins.samples !== undefined) {
      if (!isFiniteNumber(ins.samples)) ins.samples = 120;
      else ins.samples = Math.round(clamp(ins.samples, 10, 600));
    }
    if (typeof ins.active !== "boolean") ins.active = true;
  });

  // --- controls (paths resolve into lab state skeleton) ---
  const skeleton = { substances: {}, material: {}, laws: [], bench: { trail: 0, speckles: 0 } };
  config.substances.forEach((s) => {
    skeleton.substances[s.id] = { count: 0, radius: 0, mass: 0, speed: 0 };
  });
  config.material.forEach((m) => {
    skeleton.material[m.id] = { x: 0, y: 0, strength: 0, radius: 0 };
  });
  config.laws.forEach((l) => {
    const defs = (known.laws[l.law] && known.laws[l.law].defaults) || {};
    const leaf = {};
    Object.keys(defs).forEach((k) => {
      leaf[k] = 0;
    });
    skeleton.laws.push(leaf);
  });
  if (!Array.isArray(config.controls)) config.controls = [];
  config.controls.forEach((c, i) => {
    if (c === null || typeof c !== "object") {
      errors.push(`controls.${i}: must be an object`);
      return;
    }
    if (typeof c.path !== "string" || getPath(skeleton, c.path) === undefined) {
      errors.push(`controls.${i}.path: must point to a numeric value (substances.<id>.count, material.<id>.strength, laws.<n>.<param>)`);
    }
    if (typeof c.label !== "string") c.label = c.path;
    for (const k of ["min", "max", "step"]) {
      if (!isFiniteNumber(c[k])) errors.push(`controls.${i}.${k}: required finite number`);
    }
    if (isFiniteNumber(c.min) && isFiniteNumber(c.max) && c.min >= c.max) {
      errors.push(`controls.${i}: min must be < max`);
    }
  });

  // --- notebook ---
  config.notebook = config.notebook && typeof config.notebook === "object" ? config.notebook : {};
  if (typeof config.notebook.enabled !== "boolean") config.notebook.enabled = true;
  if (!Array.isArray(config.notebook.prompts)) config.notebook.prompts = [];
  config.notebook.prompts = config.notebook.prompts.filter((p) => typeof p === "string");

  if (errors.length > 0) return { config: null, warnings, errors };
  return { config, warnings, errors };
}
