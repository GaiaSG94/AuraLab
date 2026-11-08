// Law: reproduction — refill target groups up to their count (rate-limited).
export const reproduction = {
  id: "reproduction",
  notice: {
    label: "Regrowth",
    formule: "Missing particles respawn at the edges, at most <rate> per step.",
    sources: "Ad-hoc population rule written for this lab.",
    limites: "Not a birth model; rate cap keeps collapses visible.",
  },
  defaults: { rate: 3 },
  apply(world, dt, params, targets) {
    for (const g of targets) {
      const def = world.groups[g].def;
      let count = 0;
      for (const p of world.particles) if (p.e === g) count += 1;
      const refill = Math.min(def.count - count, params.rate);
      for (let k = 0; k < refill; k++) world.spawn(g, true);
    }
  },
};
