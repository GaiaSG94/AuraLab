// Law: equilibre-acido-basique — real aqueous pH via charge balance (bisection on pH in [0, 14]).
// Handles strong acid (HCl), weak acid (CH3COOH, pKa 4.76), strong base (NaOH),
// weak base (NH3, pKb 4.75), and leftover bicarbonate (pKa1 6.35, pKa2 10.33).
const KW = 1e-14;
const KA_AC = Math.pow(10, -4.76);
const KA_NH4 = Math.pow(10, -9.25);
const KA_C1 = Math.pow(10, -6.35);
const KA_C2 = Math.pow(10, -10.33);

function chargeBalance(ph, c) {
  const h = Math.pow(10, -ph);
  const oh = KW / h;
  const acMinus = c.ac * (KA_AC / (h + KA_AC));
  const nh4Plus = c.nh3 * (h / (h + KA_NH4));
  const denomC = h * h + KA_C1 * h + KA_C1 * KA_C2;
  const hco3Minus = c.bic * ((KA_C1 * h) / denomC);
  const co32Minus = c.bic * ((KA_C1 * KA_C2) / denomC);
  // Strong spectator ions: Na+ (from NaOH and NaHCO3) minus Cl- (from HCl) + 2*Cu2+ - 2*Cu2+ neutral
  return h + c.na + nh4Plus - oh - c.cl - acMinus - hco3Minus - 2 * co32Minus;
}

export const equilibreAcidoBasique = {
  id: "equilibre-acido-basique",
  notice: {
    label: "Acid-base equilibrium",
    formule: "Solves [H+] + [Na+] + [NH4+] = [OH-] + [Cl-] + [CH3COO-] + [HCO3-] + 2[CO3^2-] (bisection).",
    sources: "Brønsted-Lowry equilibria (pKa CH3COOH=4.76, NH4+=9.25, H2CO3=6.35/10.33).",
    limites: "Activity coefficients = 1; temperature fixed at 25 °C for Kw.",
  },
  defaults: {},
  apply(world) {
    if (world.volume <= 0 || !world.mmol) {
      world.ph = 7;
      world.eqPoint = false;
      return;
    }
    const v = world.volL || 0.025;
    const m = world.mmol;
    // Bicarbonate consumes strong/weak acid to form CO2 (tracked in degagement-gazeux too).
    const hTotal = m.hcl + m.ch3cooh;
    const bicReacted = Math.min(m.nahco3, hTotal);
    const bicLeft = Math.max(0, m.nahco3 - bicReacted);
    // OH- consumed by Cu(OH)2 precipitation removes free OH- from the pH balance.
    const ohUsedByCu = Math.min(m.naoh, 2 * m.cuso4);
    const naohFree = Math.max(0, m.naoh - ohUsedByCu);

    const conc = {
      na: (naohFree + m.nahco3 - bicReacted * 0) / v / 1000,
      cl: m.hcl / v / 1000,
      ac: m.ch3cooh / v / 1000,
      nh3: m.nh3 / v / 1000,
      bic: bicLeft / v / 1000,
    };
    // Subtract reacted bicarbonate H+ equivalence via effective Cl- / Ac consumption:
    // Each reacted HCO3- released CO2(g), neutralizing 1 H+ without leaving H2CO3.
    const effectiveCl = Math.max(0, m.hcl - bicReacted) / v / 1000;
    const bicUsedOnAc = Math.max(0, bicReacted - m.hcl);
    conc.cl = effectiveCl;
    conc.ac = Math.max(0, m.ch3cooh - bicUsedOnAc) / v / 1000;
    conc.na = (naohFree + bicLeft) / v / 1000;

    let lo = 0;
    let hi = 14;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) * 0.5;
      if (chargeBalance(mid, conc) > 0) lo = mid;
      else hi = mid;
    }
    const ph = Math.round(((lo + hi) * 0.5) * 100) / 100;
    world.ph = ph;
    // Equivalence marker when total acid and base are within 0.25 mmol of each other.
    const acidEq = m.hcl + m.ch3cooh;
    const baseEq = m.naoh + m.nh3 + m.nahco3;
    world.eqPoint = acidEq > 0 && baseEq > 0 && Math.abs(acidEq - baseEq) <= 0.35;
  },
};
