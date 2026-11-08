// Law: rupture — a beam breaks past the stress threshold; records stress.
export const rupture = {
  id: "rupture",
  notice: {
    label: "Breaking",
    formule: "A bar snaps past 100% load. Each cable tied to the deck holds 6 t of ghost; past that the rigging yields and the deck carries the ghost alone.",
    sources: "Toy model: load estimated from the Verlet constraint correction; cable capacity is a game rule.",
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
    // Peak, not current: the collapse journal must show what broke the bridge.
    if (worst > (world.maxStrain || 0)) world.maxStrain = worst;
    // Cable rigging yields (goes slack, reversibly) past 6 t of ghost per
    // cable tied to the deck. Adding cables never hurts: yielded cables
    // just stop helping and the deck beams decide holds/breaks.
    if (world.testing) {
      let deckCables = 0;
      let anyCable = false;
      for (const s of world.sticks) {
        if (s.broken || s.type !== "cable") continue;
        anyCable = true;
        const A = world.nodes[s.a];
        const B = world.nodes[s.b];
        if ((A && A.deck) || (B && B.deck)) deckCables++;
      }
      const charge = (world.params && world.params()["charge-flottante"]) || {};
      world.cablesYielding = anyCable && (charge.poids || 20) > 6 * deckCables;
    } else {
      world.cablesYielding = false;
    }
  },
};
