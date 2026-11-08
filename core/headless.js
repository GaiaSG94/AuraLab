// LabKit core — headless boot for custom-UI labs: validate + catalog + clock, no DOM.
// The lab mounts its own interface and drives the loop itself.
// packManifests: catalog contributions [{ laws, apparatus, measures }].
// labManifest: { measures: [{ id }] } extra measure ids beyond counts.*.
import { validateConfig } from "./validate.js";
import { mergeCatalog, builtinInstruments } from "./catalog.js";
import { createClock } from "./time.js";

export async function bootHeadless(source, packManifests, labManifest) {
  let raw;
  if (typeof source === "string") {
    const res = await fetch(source, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${source}`);
    raw = await res.json();
  } else {
    raw = source;
  }
  const catalog = mergeCatalog(packManifests || []);
  const known = {
    laws: {},
    apparatus: [],
    instruments: Object.keys(builtinInstruments),
    measures: [],
    surfaces: ["stage", "webgl"],
  };
  (packManifests || []).forEach((m) => {
    Object.keys((m && m.laws) || {}).forEach((id) => {
      known.laws[id] = { defaults: m.laws[id].defaults || {} };
    });
    Object.keys((m && m.apparatus) || {}).forEach((k) => {
      known.apparatus.push(k);
    });
    ((m && m.measures) || []).forEach((x) => {
      known.measures.push(x.id);
    });
  });
  ((labManifest && labManifest.measures) || []).forEach((x) => {
    known.measures.push(x.id);
  });
  const { config, warnings, errors } = validateConfig(raw, known);
  if (!config) throw new Error(`Invalid config:\n- ${errors.join("\n- ")}`);
  if (warnings.length > 0) console.info("[labkit] auto-tuned config:", warnings);
  const clock = createClock();
  const active = {};
  const key = (cat, id) => `${cat}:${id}`;
  (config.substances || []).forEach((s) => {
    active[key("substances", s.id)] = s.active;
  });
  (config.material || []).forEach((m) => {
    active[key("material", m.id)] = m.active;
  });
  (config.laws || []).forEach((l, i) => {
    active[key("laws", `${l.law}#${i}`)] = l.active;
  });
  return {
    config,
    catalog,
    clock,
    warnings,
    isActive: (cat, id) => active[key(cat, id)] !== false,
    setActive: (cat, id, v) => {
      active[key(cat, id)] = v;
    },
  };
}
