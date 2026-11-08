// Law: rupture — a beam breaks past the stress threshold; records stress.
export const rupture = {
  id: "rupture",
  notice: {
    label: "Breaking",
    formule: "A bar snaps when its average load passes the threshold (100% = breaking point).",
    sources: "Toy model: load estimated from the Verlet constraint correction.",
    limites: "No fatigue or buckling; same threshold for all.",
  },
  defaults: { seuil: 0.0012 },
  apply(world, dt, params) {
    let worst = 0;
    for (const s of world.sticks) {
      if (s.broken) continue;
      const stress = (s.load || 0) / (world.loadNorm || 60);
      const frac = stress / params.seuil;
      s.strain = frac;
      if (frac > worst) worst = frac;
      if (frac > 1) {
        s.broken = true;
        world.dirty = true;
      }
    }
    world.maxStrain = worst;
  },
};
