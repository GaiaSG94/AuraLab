// Law: placement-circulaire — ring placement with orbital velocity (init only).
export const placementCirculaire = {
  id: "placement-circulaire",
  notice: {
    label: "Circular placement",
    formule: "Place on a ring around the first attractor with v = sqrt(a*r) tangential.",
    sources: "Circular-orbit initial condition (derived from the gravitation law).",
    limites: "Init only; stability then depends on the gravitation law staying active.",
  },
  defaults: {},
  // Returns true when it claimed the particle (skips default random velocity).
  place(world, p, def) {
    const a = world.attractors.find((x) => x.def.active !== false);
    if (!a || !def.ring) return false;
    const W = world.W;
    const H = world.H;
    const rng = world.rng;
    const radius = (def.ring[0] + rng() * (def.ring[1] - def.ring[0])) * Math.min(W, H);
    const ang = rng() * Math.PI * 2;
    p.x = a.px + Math.cos(ang) * radius;
    p.y = a.py + Math.sin(ang) * radius;
    const d2 = radius * radius;
    const s = Math.abs(a.def.strength);
    const m = Math.min(s, (s * 9000) / (d2 + 4000));
    const v = Math.sqrt(Math.max(m, 1) * Math.max(radius, 1));
    const dir = rng() < 0.85 ? 1 : -1;
    p.vx = -Math.sin(ang) * v * dir;
    p.vy = Math.cos(ang) * v * dir;
    return true;
  },
};
