// Law: ebullition — boiling at 100 °C triggers thermal bubbles and slow steam loss.
export const ebullition = {
  id: "ebullition",
  notice: {
    label: "Boiling",
    formule: "When T >= 99.5 °C, bubbles form throughout the liquid and steam escapes.",
    sources: "Water normal boiling point at 101.3 kPa (boiling-point elevation neglected).",
    limites: "No pressure-dependent boiling point; volume loss capped.",
  },
  defaults: { boilingPoint: 99.5 },
  apply(world, dt, params) {
    if (world.volume > 0 && world.temp >= (params.boilingPoint || 99.5)) {
      world.fizz = 1;
      world.boiling = true;
    } else {
      world.boiling = false;
    }
  },
};
