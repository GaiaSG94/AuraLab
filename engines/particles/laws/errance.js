// Law: errance — smooth random walk at group speed.
export const errance = {
  id: "errance",
  notice: {
    label: "Wander",
    formule: "Heading drifts randomly; velocity eases toward speed * heading.",
    sources: "Ad-hoc steering rule written for this lab.",
    limites: "No goals, no memory; needs bounds or fields to stay in frame.",
  },
  defaults: { turn: 4 },
  apply(world, dt, params, targets) {
    for (const p of world.particles) {
      if (!targets.includes(p.e)) continue;
      const def = world.groups[p.e].def;
      p.seed += (world.rng() - 0.5) * params.turn * dt;
      world.steer(p, Math.cos(p.seed) * def.speed, Math.sin(p.seed) * def.speed, 2, dt);
    }
  },
};
