// Law: predation — remove-on-contact between pairs, counted in stats.consumed.
export const predation = {
  id: "predation",
  notice: {
    label: "Predation",
    formule: "On contact (r1+r2+margin), the prey particle is removed; counter +1.",
    sources: "Ad-hoc interaction rule written for this lab.",
    limites: "No handling time, no satiation, no energy transfer.",
  },
  defaults: { margin: 3 },
  apply(world, dt, params, targets) {
    for (let k = world.particles.length - 1; k >= 0; k--) {
      const p = world.particles[k];
      for (const [predId, preyId] of params.pairs || []) {
        if (world.groups[p.e].def.id !== predId) continue;
        const q = world.groupIndex(preyId);
        if (q === -1) continue;
        const t = world.nearest(q, p.x, p.y, null);
        if (t !== null && t.d < p.r + t.p.r + params.margin) {
          const qi = world.particles.indexOf(t.p);
          if (qi !== -1) {
            world.particles.splice(qi, 1);
            world.stats.consumed += 1;
          }
        }
      }
    }
  },
};
