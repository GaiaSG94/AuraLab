// Bridge Lab wiring (DOM-free): one world per site, laws resolved from the catalog.
// Mirrors app-ponts/game.js, but without any rendering, so the lab can be
// simulated headlessly (tests, validator, MCP server).
import { createWorld } from "../engines/ponts/world.js";

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
  const sites = config.sites || [];
  const worlds = {};
  for (const site of sites) {
    const world = createWorld({ laws: resolveLaws(api.catalog, config), site });
    worlds[site.id] = world;
  }
  const first = sites[0];
  const state = {
    substances: byId(config.substances),
    material: byId(config.material),
    laws: config.laws.map((l, i) => ({ ...api.catalog.laws[l.law].defaults, ...(l.params || {}) })),
    bench: config.bench,
  };
  return {
    state,
    worlds,
    site: first,
    step: (dt, isActive) => {
      for (const id of Object.keys(worlds)) worlds[id].step(dt, isActive);
    },
    draw: (ctx, W, H, isActive, hexToRgb) => {
      if (first && worlds[first.id]) worlds[first.id].draw(ctx, W, H, isActive, hexToRgb);
    },
    reset: () => {
      for (const id of Object.keys(worlds)) worlds[id].reset();
    },
    resync: () => {
      for (const id of Object.keys(worlds)) worlds[id].rebind();
    },
    setSize: (w, h) => {
      for (const id of Object.keys(worlds)) worlds[id].setSize(w, h);
    },
    measures: () => (first ? worlds[first.id].measures() : {}),
  };
}
