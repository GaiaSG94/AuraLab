// Law: reaction-acide — acid in the mix fizzes, heats and drops the pH.
export const reactionAcide = {
  id: "reaction-acide",
  notice: {
    label: "Acid reaction",
    formule: "Acid + mix → bubbles; +3 °C/s per acid dose; pH → 2.5.",
    sources: "Simplified school model (acid + base → gas + heat).",
    limites: "No stoichiometry; binary pH (7 or 2.5).",
  },
  defaults: {},
  apply(world, dt, params, targets, active) {
    const d = world.doses();
    if (d.acide > 0 && d.bleu + d.jaune > 0) {
      world.fizz = 1;
      world.temp = Math.min(100, world.temp + 3 * d.acide * dt);
      world.ph = 2.5;
    }
  },
};
