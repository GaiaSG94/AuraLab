// Aura-Eco lab wiring: particle world + catalog laws declared in config.json.
// Same pattern as Aura-Space; only the config content differs.
import { createWorld } from "../engines/particles/world.js";

export const labManifest = { measures: [] };

function byId(arr) {
  const o = {};
  arr.forEach((x) => {
    o[x.id] = x;
  });
  return o;
}

export function buildLab(api, config) {
  const laws = config.laws.map((entry, i) => {
    const mod = api.catalog.laws[entry.law];
    return {
      id: `${entry.law}#${i}`,
      mod,
      targetIds: entry.targets || null,
      params: { ...mod.defaults, ...(entry.params || {}) },
    };
  });
  const world = createWorld({
    substances: config.substances,
    material: config.material,
    laws,
    bounds: config.bounds,
  });
  return {
    state: {
      substances: byId(config.substances),
      material: byId(config.material),
      laws: laws.map((l) => l.params),
      bench: config.bench,
    },
    step: (dt, isActive) => world.step(dt, isActive),
    draw: (ctx, W, H, isActive, hexToRgb) => world.draw(ctx, W, H, isActive, hexToRgb),
    reset: () => world.reset(),
    resync: () => world.syncCounts(),
    setSize: (w, h) => world.setSize(w, h),
    measures: () => world.measures(),
  };
}
