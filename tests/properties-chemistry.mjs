// Property-based tests for the real chemistry model (engines/chimie/).
// These pin the stoichiometry: a wrong pKa, a wrong molar mass or a wrong
// balance shows up here, not in a screenshot.
import { bootLab, runSteps } from "./labs.mjs";
import { Suite } from "./harness.mjs";

export const suite = new Suite("chemistry");

const REAGENTS = ["hcl", "ch3cooh", "naoh", "nh3", "cuso4", "nahco3", "agno3", "bbt"];

// Boot the chemistry lab and set the doses (1 dose = 25 mL of 0.1 M solution).
async function flask(doses = {}, buretteMl = 0, frames = 12) {
  const booted = await bootLab("app-chimie");
  REAGENTS.forEach((id) => {
    if (booted.lab.state.substances[id]) booted.lab.state.substances[id].count = doses[id] || 0;
  });
  booted.lab.state.material.burette.strength = buretteMl;
  booted.lab.world.reset();
  runSteps(booted, frames);
  return booted.lab.world;
}

suite.test("an empty flask holds water at neutral pH and ambient temperature", async () => {
  const w = await flask({}, 0, 2);
  if (w.volume !== 0) throw new Error(`empty flask has volume ${w.volume}`);
  if (Math.abs(w.ph - 7) > 0.01) throw new Error(`empty flask pH is ${w.ph}, expected 7`);
});

suite.test("0.1 M HCl reads pH ~1.0 and 0.1 M NaOH reads pH ~13.0", async () => {
  const acid = await flask({ hcl: 1 });
  if (acid.ph > 1.15 || acid.ph < 0.85) throw new Error(`1 dose HCl: pH ${acid.ph}, expected ~1.0`);
  const base = await flask({ naoh: 1 });
  if (base.ph < 12.8 || base.ph > 13.2) throw new Error(`1 dose NaOH: pH ${base.ph}, expected ~13.0`);
});

suite.test("HCl + equimolar NaOH neutralizes to pH ~7", async () => {
  const w = await flask({ hcl: 1, naoh: 1 });
  if (Math.abs(w.ph - 7) > 0.35) throw new Error(`equivalence pH ${w.ph}, expected ~7`);
  if (!w.eqPoint) throw new Error("the equivalence point was not detected");
});

suite.test("strong acid + strong base neutralization is exothermic", async () => {
  const w = await flask({ hcl: 2, naoh: 2 }, 0, 6);
  if (w.temp <= 20.2) throw new Error(`temperature ${w.temp} ??C did not rise above ambient`);
});

suite.test("acetic acid + equimolar NaOH ends basic at equivalence (weak acid)", async () => {
  const w = await flask({ ch3cooh: 1, naoh: 1 });
  if (w.ph < 7.5 || w.ph > 10) throw new Error(`CH3COOH equivalence pH ${w.ph}, expected 8-9 (acetate hydrolysis)`);
});

suite.test("the burette titrates: pH rises monotonically with added NaOH", async () => {
  let previous = 0;
  for (const ml of [0, 5, 10, 20, 30, 45]) {
    const w = await flask({ hcl: 1 }, ml);
    if (w.ph < previous - 0.05) {
      throw new Error(`pH went from ${previous} down to ${w.ph} at ${ml} mL of burette`);
    }
    previous = w.ph;
  }
  if (previous < 10) throw new Error(`titration never became basic (final pH ${previous})`);
});

suite.test("CuSO4 + 2 NaOH precipitates blue Cu(OH)2 with the right mass", async () => {
  // 2 doses CuSO4 = 5 mmol Cu2+; 5 doses NaOH = 12.5 mmol OH- -> Cu2+ limiting.
  const w = await flask({ cuso4: 2, naoh: 5 });
  if (w.precipite <= 0) throw new Error("no precipitate formed");
  const expected = (5 / 1000) * 97.56; // 5 mmol Cu2+ -> 5 mmol Cu(OH)2
  if (Math.abs(w.precipite - expected) > 0.02) {
    throw new Error(`precipitate ${w.precipite} g, expected ~${expected.toFixed(3)} g`);
  }
  if (w.precipiteColor !== "#0ea5e9") throw new Error(`precipitate color ${w.precipiteColor}, expected Cu(OH)2 blue`);
});

suite.test("excess ammonia redissolves Cu(OH)2 into the deep-blue complex", async () => {
  const plain = await flask({ cuso4: 1, naoh: 2 });
  if (plain.precipite <= 0) throw new Error("control: no precipitate before adding NH3");
  const complexed = await flask({ cuso4: 1, naoh: 2, nh3: 8 });
  if (complexed.precipite > plain.precipite) {
    throw new Error("the complexing agent did not redissolve the copper hydroxide");
  }
  if (!complexed.cuComplex) throw new Error("[Cu(NH3)4]2+ complex not flagged");
  if (complexed.liquidHex !== "#1e3a8a") {
    throw new Error(`complex color ${complexed.liquidHex}, expected royal blue`);
  }
});

suite.test("AgNO3 + HCl precipitates white AgCl in stoichiometric amount", async () => {
  const w = await flask({ agno3: 2, hcl: 1 });
  const expected = (2.5 / 1000) * 143.32; // 1 dose HCl = 2.5 mmol Cl- limits
  if (Math.abs(w.precipite - expected) > 0.02) {
    throw new Error(`AgCl mass ${w.precipite} g, expected ~${expected.toFixed(3)} g`);
  }
  if (w.precipiteColor !== "#f1f5f9") throw new Error(`precipitate color ${w.precipiteColor}, expected white`);
});

suite.test("NaHCO3 + acid releases CO2 and lifts the manometer", async () => {
  const w = await flask({ nahco3: 1, hcl: 1 }, 0, 4);
  if (w.pression <= 102) throw new Error(`pressure ${w.pression} kPa did not rise above atmosphere`);
  if (w._co2Mmol <= 0) throw new Error("no CO2 was produced");
});

suite.test("NaHCO3 without acid releases no gas", async () => {
  const w = await flask({ nahco3: 2 });
  if (w._co2Mmol !== 0) throw new Error(`CO2 ${w._co2Mmol} mmol produced with no acid present`);
  if (w.pression > 102) throw new Error(`pressure ${w.pression} kPa rose with no acid`);
});

suite.test("bromothymol blue tracks the pH: yellow / green / blue", async () => {
  const acid = await flask({ bbt: 1, hcl: 1 });
  if (acid.liquidHex !== "#eab308") throw new Error(`acidic BBT ${acid.liquidHex}, expected yellow`);
  const neutral = await flask({ bbt: 1, hcl: 1, naoh: 1 });
  if (neutral.liquidHex !== "#16a34a") throw new Error(`neutral BBT ${neutral.liquidHex}, expected green`);
  const basic = await flask({ bbt: 1, naoh: 1 });
  if (basic.liquidHex !== "#2563eb") throw new Error(`basic BBT ${basic.liquidHex}, expected blue`);
});

suite.test("volume is the sum of the doses (25 mL each) plus the burette", async () => {
  const w = await flask({ hcl: 1, cuso4: 2 }, 10);
  if (w.volume !== 85) throw new Error(`volume ${w.volume} mL, expected 25*3 + 10 = 85 mL`);
});

// The property that matters most: no combination of reagents may ever produce
// a non-finite or out-of-domain measure.
suite.property(
  "every reagent combination keeps pH in [0, 14] and measures finite",
  (rng) => {
    const doses = {};
    REAGENTS.forEach((id) => {
      doses[id] = Math.floor(rng() * 4);
    });
    return { doses, buretteMl: Math.floor(rng() * 50) };
  },
  async ({ doses, buretteMl }) => {
    const w = await flask(doses, buretteMl, 6);
    if (!Number.isFinite(w.ph) || w.ph < 0 || w.ph > 14) {
      throw new Error(`pH ${w.ph} out of domain for ${JSON.stringify(doses)} + ${buretteMl} mL`);
    }
    for (const key of ["temp", "volume", "precipite", "pression"]) {
      if (!Number.isFinite(w[key])) throw new Error(`${key} is ${w[key]} for ${JSON.stringify(doses)}`);
    }
    if (w.temp < 0 || w.temp > 100) throw new Error(`temperature ${w.temp} ??C out of range`);
    if (w.precipite < 0) throw new Error(`negative precipitate mass ${w.precipite} g`);
    if (w.pression < 90) throw new Error(`pressure ${w.pression} kPa below atmosphere`);
  },
  { runs: 40 },
);

suite.property(
  "dilution never lowers pH when a strong base is added",
  (rng) => {
    return { acid: 1 + Math.floor(rng() * 2), base: Math.floor(rng() * 40) };
  },
  async ({ acid, base }) => {
    const before = await flask({ hcl: acid }, 0);
    const after = await flask({ hcl: acid }, base);
    if (after.ph < before.ph - 0.01) {
      throw new Error(`adding ${base} mL NaOH lowered pH from ${before.ph} to ${after.ph}`);
    }
  },
  { runs: 20 },
);
