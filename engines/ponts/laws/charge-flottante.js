// Law: charge-flottante — the test ghost hovers across and presses on nearby deck nodes.
export const chargeFlottante = {
  id: "charge-flottante",
  notice: {
    label: "Floating load",
    formule: "The ghost (weight t) floats above the deck at speed m/s and pushes nearby nodes.",
    sources: "Moving point load (toy model).",
    limites: "One ghost; deck assumed continuous.",
  },
  defaults: { poids: 20, vitesse: 6 },
  apply(world, dt, params) {
    if (!world.testing) return;
    world.ghost.x += params.vitesse * dt;
    for (const n of world.nodes) {
      if (!n.deck || n.fixed) continue;
      const dist = Math.abs(n.x - world.ghost.x);
      if (dist < 3) n.ay -= params.poids * 2.2 * (1 - dist / 3);
    }
    if (world.ghost.x > world.half + 1.5) world.finishTest();
  },
};
