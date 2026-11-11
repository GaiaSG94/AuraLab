// Law: precipitation — forms insoluble Cu(OH)2 (blue) and AgCl (white); computes mass in g.
// Excess NH3 dissolves Cu(OH)2 into the deep-blue [Cu(NH3)4]2+ complex.
const M_CUOH2 = 97.56;
const M_AGCL = 143.32;

export const precipitation = {
  id: "precipitation",
  notice: {
    label: "Precipitation",
    formule: "Cu2+ + 2 OH- -> Cu(OH)2↓ (blue, 97.6 g/mol); Ag+ + Cl- -> AgCl↓ (white, 143.3 g/mol); excess NH3 complexes Cu2+.",
    sources: "Qualitative inorganic analysis (solubility products Ksp << 10^-10).",
    limites: "Instantaneous precipitation; no crystal growth kinetics.",
  },
  defaults: {},
  apply(world) {
    if (!world.mmol || world.volume <= 0) {
      world.precipite = 0;
      world.precipiteColor = null;
      world.cuComplex = false;
      return;
    }
    const m = world.mmol;
    // Complexation: 4 NH3 per Cu2+ keeps Cu2+ soluble as deep-blue [Cu(NH3)4]2+.
    const cuComplexed = Math.min(m.cuso4, m.nh3 / 4);
    const cuFree = Math.max(0, m.cuso4 - cuComplexed);
    world.cuComplex = cuComplexed > 0.05;

    // Cu2+ + 2 OH- -> Cu(OH)2 (also triggered weakly by NH3 if below 4:1 ratio).
    const ohAvail = m.naoh + Math.max(0, m.nh3 - cuComplexed * 4) * 0.25;
    const cuOh2Mmol = Math.min(cuFree, ohAvail / 2);

    // Ag+ + Cl- -> AgCl
    const agClMmol = Math.min(m.agno3, m.hcl);

    const massCu = (cuOh2Mmol / 1000) * M_CUOH2;
    const massAg = (agClMmol / 1000) * M_AGCL;
    const total = Math.round((massCu + massAg) * 1000) / 1000;
    world.precipite = total;
    if (total <= 0.001) {
      world.precipiteColor = null;
    } else if (massCu >= massAg) {
      world.precipiteColor = "#0ea5e9"; // vivid Cu(OH)2 sky-blue floc
    } else {
      world.precipiteColor = "#f1f5f9"; // milky white AgCl curds
    }
  },
};
