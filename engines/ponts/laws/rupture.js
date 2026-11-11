// Law: rupture — a member snaps past its own strength; records peak stress.
// The threshold is per material: steel and concrete hold far more than rope.
import { MATERIALS } from "../materials.js";

export const rupture = {
  id: "rupture",
  notice: {
    label: "Breaking",
    formule: "A member snaps when its load fraction exceeds strength(seuil / material.strength). Cables tied to the deck yield past 6 t of ghost each.",
    sources: "Toy model: load estimated from the Verlet constraint correction; per-material strength ratios.",
    limites: "No fatigue, no buckling curve; one threshold per material.",
  },
  defaults: { seuil: 0.0012 },
  apply(world, dt, params) {
    let worst = 0;
    for (const s of world.sticks) {
      if (s.broken) continue;
      const def = MATERIALS[s.mat];
      const stress = (s.load || 0) / (world.loadNorm || 60);
      const frac = stress / (params.seuil / (def ? def.strength : 1));
      s.strain = frac;
      if (frac > worst) worst = frac;
      if (frac > 1) {
        s.broken = true;
        world.dirty = true;
      }
    }
    // Peak, not current: the collapse journal must show what broke the bridge.
    if (worst > (world.maxStrain || 0)) world.maxStrain = worst;
    updateCableYield(world);
  },
};

// Cable rigging yields (goes slack, reversibly) past 6 t of ghost per cable
// tied to the deck. Adding cables never hurts: yielded cables just stop
// helping and the deck beams decide holds/breaks.
function updateCableYield(world) {
  if (!world.testing) {
    world.cablesYielding = false;
    return;
  }
  let deckCables = 0;
  let anyCable = false;
  for (const s of world.sticks) {
    if (s.broken) continue;
    const def = MATERIALS[s.mat];
    if (!def || def.kind !== "cable") continue;
    anyCable = true;
    const A = world.nodes[s.a];
    const B = world.nodes[s.b];
    if ((A && A.deck) || (B && B.deck)) deckCables++;
  }
  const charge = (world.params && world.params()["charge-flottante"]) || {};
  world.cablesYielding = anyCable && (charge.poids || 20) > 6 * deckCables;
}
