// Law: derive — ballistic drift with a gentle pull toward the center.
export const derive = {
  id: "derive",
  notice: {
    label: "Drift",
    formule: "Keeps initial velocity; weak pull toward the center keeps bodies in frame.",
    sources: "Ad-hoc steering rule written for this lab.",
    limites: "No friction model; pull is arbitrary, not physical.",
  },
  defaults: { pull: 0.02 },
  apply(world, dt, params, targets) {
    for (const p of world.particles) {
      if (!targets.includes(p.e)) continue;
      p.ax += (world.W / 2 - p.x) * params.pull;
      p.ay += (world.H / 2 - p.y) * params.pull;
    }
  },
};
