// Bridge Lab wiring (DOM-free): the level machine.
// One world at a time — the current level. game.js drives setLevel(); the
// validator, the MCP server and the tests use the same entry point.
import { createWorld } from "../engines/ponts/world.js";
import { levelSpec } from "../engines/ponts/levels.js";

export const labManifest = {
  measures: [{ id: "fleche" }, { id: "contrainte" }, { id: "cout" }, { id: "score" }],
};

function byId(arr) {
  const o = {};
  (arr || []).forEach((x) => {
    o[x.id] = x;
  });
  return o;
}

function resolveLaws(catalog, config) {
  return config.laws.map((entry, i) => {
    const mod = catalog.laws[entry.law];
    return {
      id: `${entry.law}#${i}`,
      mod,
      targetIds: entry.targets || null,
      params: { ...mod.defaults, ...(entry.params || {}) },
    };
  });
}

export function buildLab(api, config) {
  const rules = config.levels;
  const state = {
    substances: byId(config.substances),
    material: byId(config.material),
    laws: config.laws.map((l) => ({ ...api.catalog.laws[l.law].defaults, ...(l.params || {}) })),
    bench: config.bench,
  };
  const laws = resolveLaws(api.catalog, config);

  // Build the world of one level. The level owns the gap width, the budget and
  // the material palette; the ladder params are pushed into the law.
  function buildLevel(level, purse) {
    const spec = levelSpec(level, purse, rules);
    const world = createWorld({ laws: laws.map((l) => ({ ...l, params: { ...l.params } })), site: spec });
    const charge = world.params()["charge-flottante"];
    if (charge) {
      charge.poids = spec.ladder.heaviest;
      charge.echelons = spec.ladder.rungs;
    }
    return { spec, world };
  }

  let current = buildLevel(1, (rules && rules.purse && rules.purse.start) || 90);
  const worlds = { [current.spec.id]: { site: current.spec, world: current.world, laws } };

  return {
    state,
    worlds,
    spec: current.spec,
    get world() {
      return current.world;
    },
    // Switch level: returns the freshly built { spec, world }.
    setLevel(level, purse) {
      const built = buildLevel(level, purse);
      current = built;
      worlds[built.spec.id] = { site: built.spec, world: built.world, laws };
      return built;
    },
    step: (dt, isActive) => current.world.step(dt, isActive),
    draw: (ctx, W, H, isActive, hexToRgb) => current.world.draw(ctx, W, H, isActive, hexToRgb),
    reset: () => current.world.reset(),
    resync: () => current.world.rebind(),
    setSize: (w, h) => current.world.setSize(w, h),
    measures: () => current.world.measures(),
  };
}
