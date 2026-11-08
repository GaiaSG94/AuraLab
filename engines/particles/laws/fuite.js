// Law: fuite — steer away from the nearest threat (flee), wander when safe.
export const fuite = {
  id: "fuite",
  notice: {
    label: "Flight",
    formule: "Within range, velocity eases away from the nearest threat; else wander.",
    sources: "Ad-hoc steering rule written for this lab.",
    limites: "Single threat type; fixed panic range for all pairs.",
  },
  defaults: { gain: 1.35, range: 240 },
  apply(world, dt, params, targets) {
    for (const [fleerId, threatId] of params.pairs || []) {
      const f = world.groupIndex(fleerId);
      const t0 = world.groupIndex(threatId);
      if (f === -1 || t0 === -1) continue;
      for (const p of world.particles) {
        if (p.e !== f) continue;
        const def = world.groups[p.e].def;
        const t = world.nearest(t0, p.x, p.y, p);
        if (t !== null && t.d > 0.01 && t.d < params.range) {
          const sp = def.speed * params.gain;
          world.steer(p, ((p.x - t.p.x) / t.d) * sp, ((p.y - t.p.y) / t.d) * sp, 3, dt);
        } else {
          world.wanderStep(p, def, 4, dt);
        }
      }
    }
  },
};
