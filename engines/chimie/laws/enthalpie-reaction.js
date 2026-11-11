// Law: enthalpie-reaction — heat of neutralization (ΔH = -57.3 kJ/mol) + Bunsen burner + cooling.
export const enthalpieReaction = {
  id: "enthalpie-reaction",
  notice: {
    label: "Reaction enthalpy & heating",
    formule: "ΔT = (n_neut * 57.3 kJ/mol) / (m_water * 4.184 J/g·K) + burner power - Newton cooling.",
    sources: "Standard enthalpy of neutralization H+ + OH- -> H2O (-57.3 kJ/mol); Newton's cooling law.",
    limites: "Heat capacity of glass neglected; weak-acid ionization ΔH approximated as strong.",
  },
  defaults: { ambient: 20, deltaH: 57.3 },
  apply(world, dt, params, targets, active) {
    const amb = params.ambient || 20;
    if (world.mmol && world.volume > 0) {
      const acid = world.mmol.hcl + world.mmol.ch3cooh;
      const base = world.mmol.naoh + world.mmol.nh3;
      const neutMmol = Math.min(acid, base);
      const prev = world._neutMmol || 0;
      const dMmol = Math.max(0, neutMmol - prev);
      if (dMmol > 0) {
        // 1 mmol reacting releases 57.3 J; water Cp = 4.184 J/(g·K), mass ~ volume (g).
        const energyJ = dMmol * (params.deltaH || 57.3);
        const massG = Math.max(20, world.volume);
        world.temp = Math.min(100, world.temp + energyJ / (massG * 4.184));
      }
      world._neutMmol = neutMmol;
    } else {
      world._neutMmol = 0;
    }
    const b = world.material.bruleur;
    if (b && active("material", "bruleur") && b.strength > 0) {
      world.heating = true;
      world.temp = Math.min(100, world.temp + (b.strength / 100) * 20 * dt);
    } else {
      world.heating = false;
    }
    world.temp += (amb - world.temp) * Math.min(1, 0.12 * dt);
    world.temp = Math.max(0, Math.min(100, world.temp));
  },
};
