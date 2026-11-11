// Law: dilution — computes total solution volume (mL) and molar concentrations (mol/L).
export const dilution = {
  id: "dilution",
  notice: {
    label: "Dilution & volume",
    formule: "V_tot = sum(doses * V_dose) + V_burette; C_i = n_i / V_tot.",
    sources: "Conservation of mass and volume for dilute aqueous solutions.",
    limites: "Assumes additive volumes (valid below 1 M); ignores volume of solids.",
  },
  defaults: { doseMl: 25, molarity: 0.1 },
  apply(world, dt, params) {
    const d = world.doses();
    const dm = params.doseMl || 25;
    const m = params.molarity || 0.1;
    // BBT indicator comes in 5 mL dropper doses; reagent solutions are 25 mL each.
    const reagentVol = (d.hcl + d.ch3cooh + d.naoh + d.nh3 + d.cuso4 + d.nahco3 + d.agno3) * dm;
    const bbtVol = d.bbt * 5;
    const buretteVol = world.buretteMl || 0; // NaOH 0.1 M added drop-by-drop
    const totalMl = reagentVol + bbtVol + buretteVol;
    world.volume = Math.min(500, totalMl);
    const volL = Math.max(0.001, totalMl / 1000);
    // Stored as millimoles (mmol) so stoichiometry stays exact before dividing by V.
    world.mmol = {
      hcl: d.hcl * dm * m,
      ch3cooh: d.ch3cooh * dm * m,
      naoh: (d.naoh * dm + buretteVol) * m,
      nh3: d.nh3 * dm * m,
      cuso4: d.cuso4 * dm * m,
      nahco3: d.nahco3 * dm * m,
      agno3: d.agno3 * dm * m,
      bbt: d.bbt,
    };
    world.volL = volL;
  },
};
