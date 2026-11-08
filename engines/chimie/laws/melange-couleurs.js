// Law: melange-couleurs — mixed doses blend (blue + yellow -> green); volume adds up.
export const melangeCouleurs = {
  id: "melange-couleurs",
  notice: {
    label: "Color mixing",
    formule: "Blue + yellow → green. Volume = sum of doses (1 dose = 100 mL).",
    sources: "Simplified mixing rule (subtractive synthesis).",
    limites: "Two colors only; no precipitate or real reaction.",
  },
  defaults: {},
  apply(world, dt, params, targets, active) {
    const d = world.doses();
    world.mixed = d.bleu > 0 && d.jaune > 0;
    world.volume = (d.bleu + d.jaune + d.acide) * 100;
  },
};
