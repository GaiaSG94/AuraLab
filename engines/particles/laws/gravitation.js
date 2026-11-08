// Law: gravitation — point attraction (positive strength) or repulsion (negative).
export const gravitation = {
  id: "gravitation",
  notice: {
    label: "Gravitation",
    formule: "a = sign(S) * min(|S|, |S|*9000/(d^2+4000)) toward each attractor, divided by mass.",
    sources: "Simplified Newtonian point-mass gravity (softened core).",
    limites: "No collisions, no relativity; one softening length for all pairs.",
  },
  defaults: {},
  apply(world, dt, params, targets, active) {
    for (const p of world.particles) {
      const def = world.groups[p.e].def;
      for (const a of world.attractors) {
        if (!active("material", a.def.id)) continue;
        const dx = a.px - p.x;
        const dy = a.py - p.y;
        const d2 = dx * dx + dy * dy;
        const d = Math.sqrt(d2) || 0.001;
        const s = Math.abs(a.def.strength);
        const m = Math.min(s, (s * 9000) / (d2 + 4000));
        const acc = Math.sign(a.def.strength) * m / def.mass;
        p.ax += (dx / d) * acc;
        p.ay += (dy / d) * acc;
      }
    }
  },
};
