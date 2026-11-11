// Law: poids-propre — each member pulls its own weight down onto its two nodes.
// Heavy materials (steel, concrete) sag the deck before the ghost even moves.
import { MATERIALS } from "../materials.js";

export const poidsPropre = {
  id: "poids-propre",
  notice: {
    label: "Self-weight",
    formule: "Each member adds -g * weight to both its nodes, so a heavy deck sags before any load arrives.",
    sources: "Dead load (structural self-weight), the first load every real bridge must carry.",
    limites: "Lumped at the two end nodes; no continuous beam weight.",
  },
  defaults: { g: 9.81 },
  apply(world, dt, params) {
    for (const s of world.sticks) {
      if (s.broken) continue;
      const def = MATERIALS[s.mat];
      if (!def) continue;
      const pull = -params.g * def.weight * 0.5;
      world.nodes[s.a].ay += pull;
      world.nodes[s.b].ay += pull;
    }
  },
};
