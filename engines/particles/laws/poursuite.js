// Law: poursuite — steer toward the nearest target (seek).
export const poursuite = {
  id: "poursuite",
  notice: {
    label: "Pursuit",
    formule: "Velocity eases toward the nearest target particle at 1.35x group speed.",
    sources: "Ad-hoc steering rule written for this lab.",
    limites: "Omniscient nearest-target search; no vision cone, no stamina.",
  },
  defaults: { gain: 1.35 },
  apply(world, dt, params, targets) {
    for (const [hunterId, preyId] of params.pairs || []) {
      const h = world.groupIndex(hunterId);
      const q = world.groupIndex(preyId);
      if (h === -1 || q === -1) continue;
      for (const p of world.particles) {
        if (p.e !== h) continue;
        const def = world.groups[p.e].def;
        const t = world.nearest(q, p.x, p.y, p);
        if (t !== null && t.d > 0.01) {
          const sp = def.speed * params.gain;
          world.steer(p, ((t.p.x - p.x) / t.d) * sp, ((t.p.y - p.y) / t.d) * sp, 3, dt);
        } else {
          world.wanderStep(p, def, 4, dt);
        }
      }
    }
  },
};
