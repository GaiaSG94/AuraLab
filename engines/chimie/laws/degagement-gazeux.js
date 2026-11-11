// Law: degagement-gazeux — NaHCO3 + H+ -> CO2↑ + H2O + Na+; drives fizzing and manometer pressure.
export const degagementGazeux = {
  id: "degagement-gazeux",
  notice: {
    label: "Gas evolution (CO2)",
    formule: "HCO3- + H+ -> CO2↑ + H2O; ΔP = n_CO2 * R * T / V_headspace (kPa).",
    sources: "Ideal gas law (R = 8.314 J/mol·K) applied to flask headspace (500 mL - V_liq).",
    limites: "CO2 solubility in water neglected; slow venting models a loose stopper.",
  },
  defaults: { pAtm: 101.3 },
  apply(world, dt, params) {
    const pAtm = params.pAtm || 101.3;
    if (!world.mmol || world.volume <= 0) {
      world.pression = pAtm;
      world._co2Mmol = 0;
      world.gasFizz = 0;
      return;
    }
    const m = world.mmol;
    const hTotal = m.hcl + m.ch3cooh;
    const co2Mmol = Math.min(m.nahco3, hTotal);
    const prev = world._co2Mmol || 0;
    const dCo2 = Math.max(0, co2Mmol - prev);
    world._co2Mmol = co2Mmol;

    if (dCo2 > 0) {
      // Ideal gas pressure surge in remaining flask headspace (min 80 mL).
      const headL = Math.max(0.08, (500 - world.volume) / 1000);
      const nMol = dCo2 / 1000;
      const T = 273.15 + (world.temp || 20);
      const dP = (nMol * 8.314 * T) / headL; // kPa
      world.pression = Math.min(260, (world.pression || pAtm) + dP);
      world.gasFizz = Math.min(1, (world.gasFizz || 0) + 0.8);
    }
    // Gradual decay of active effervescence and slow venting back toward pAtm.
    world.gasFizz = Math.max(0, (world.gasFizz || 0) - 0.35 * dt);
    world.pression = pAtm + ((world.pression || pAtm) - pAtm) * Math.exp(-0.25 * dt);
    world.pression = Math.round(world.pression * 10) / 10;
    if (world.gasFizz > 0.05) world.fizz = 1;
  },
};
