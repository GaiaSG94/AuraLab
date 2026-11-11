// Law: charge-flottante — a ladder of test ghosts crosses the deck one after
// the other, each heavier than the last. The bridge must hold the whole ladder.
export const chargeFlottante = {
  id: "charge-flottante",
  notice: {
    label: "Floating load ladder",
    formule: "N ghosts cross in turn, weighing poids/N, 2*poids/N ... poids. Each presses on the deck nodes within 3 m of it. The bridge must carry the heaviest.",
    sources: "Moving point load (toy model), staged like a real proof-load test.",
    limites: "One ghost on the deck at a time; deck assumed continuous.",
  },
  defaults: { poids: 20, vitesse: 6, echelons: 4 },
  apply(world, dt, params) {
    if (!world.testing) return;
    const ghost = world.ghosts[world.ghostIndex];
    if (!ghost || ghost.state === "fallen") return;
    ghost.x += params.vitesse * dt;
    for (const n of world.nodes) {
      if (!n.deck || n.fixed) continue;
      const dist = Math.abs(n.x - ghost.x);
      if (dist < 3) n.ay -= ghost.weight * 2.2 * (1 - dist / 3);
    }
    if (ghost.x > world.half + 1.5) world.ghostReachedBank();
  },
};
