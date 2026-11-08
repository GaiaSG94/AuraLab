// Law: gravite — free nodes accelerate downward (Verlet integration).
export const gravite = {
  id: "gravite",
  notice: {
    label: "Gravity",
    formule: "Each free node accelerates downward at g = 9.81 m/s² (Verlet, fixed step).",
    sources: "Verlet integration.",
    limites: "No wind or quake.",
  },
  defaults: { g: 9.81 },
  apply(world, dt, params) {
    for (const n of world.nodes) {
      if (n.fixed) { n.ax = 0; n.ay = 0; continue; }
      n.ax = 0;
      n.ay = -params.g;
    }
  },
};
