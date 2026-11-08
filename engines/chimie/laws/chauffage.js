// Law: chauffage — the bunsen burner heats toward boiling; cooling is always on.
export const chauffage = {
  id: "chauffage",
  notice: {
    label: "Heating",
    formule: "Burner on: +22 °C/s at full power; drifts back to 19 °C otherwise. Boils at 100 °C.",
    sources: "First-order thermal model (simplified Newton cooling).",
    limites: "Losses not modelled; one heated body.",
  },
  defaults: {},
  apply(world, dt, params, targets, active) {
    const b = world.material.bruleur;
    if (b && active("material", "bruleur") && b.strength > 0) {
      world.heating = true;
      world.temp = Math.min(100, world.temp + (b.strength / 100) * 22 * dt);
    }
  },
};
