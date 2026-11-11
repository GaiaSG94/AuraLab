// End-to-end scenario checks for the Chemistry Lab: drive the real lab through
// a titration and a precipitation, then assert what the instruments report.
// This is what a browser screenshot cannot prove.
import { bootLab, runSteps } from "./labs.mjs";
import { Suite } from "./harness.mjs";

export const suite = new Suite("chemistry-scenarios");

const REAGENTS = ["hcl", "ch3cooh", "naoh", "nh3", "cuso4", "nahco3", "agno3", "bbt"];

async function scenario(doses, buretteMl = 0, frames = 30) {
  const booted = await bootLab("app-chimie");
  REAGENTS.forEach((id) => {
    if (booted.lab.state.substances[id]) booted.lab.state.substances[id].count = doses[id] || 0;
  });
  booted.lab.state.material.burette.strength = buretteMl;
  booted.lab.state.material.bruleur.strength = 0;
  booted.lab.world.reset();
  runSteps(booted, frames);
  return { booted, world: booted.lab.world, measures: booted.lab.measures() };
}

suite.test("a full titration crosses the equivalence point and warms the flask", async () => {
  const points = [];
  for (const ml of [0, 5, 10, 15, 20, 25, 30, 40]) {
    const { world } = await scenario({ hcl: 1 }, ml, 8);
    points.push({ ml, ph: world.ph, temp: world.temp, eq: world.eqPoint });
  }
  // The pH must climb monotonically across the titration.
  for (let i = 1; i < points.length; i++) {
    if (points[i].ph < points[i - 1].ph - 0.01) {
      throw new Error(`pH fell from ${points[i - 1].ph} to ${points[i].ph} at ${points[i].ml} mL`);
    }
  }
  if (points[0].ph > 2) throw new Error(`starting pH ${points[0].ph} is not acidic`);
  if (points[points.length - 1].ph < 11) {
    throw new Error(`final pH ${points[points.length - 1].ph} never became basic`);
  }
  // 25 mL of 0.1 M NaOH exactly neutralises 25 mL of 0.1 M HCl.
  const atEquivalence = points.find((p) => p.ml === 25);
  if (!atEquivalence) throw new Error("no 25 mL point sampled");
  if (Math.abs(atEquivalence.ph - 7) > 0.6) {
    throw new Error(`equivalence pH ${atEquivalence.ph}, expected ~7`);
  }
  if (!atEquivalence.eq) throw new Error("the equivalence point was not flagged at 25 mL");
  if (atEquivalence.temp <= 20.5) {
    throw new Error(`neutralisation released no heat: ${atEquivalence.temp} °C`);
  }
});

suite.test("precipitation is visible to the balance and to the colour law", async () => {
  const { world } = await scenario({ cuso4: 2, naoh: 5 });
  if (world.precipite <= 0) throw new Error("no precipitate on the balance");
  if (world.precipiteColor !== "#0ea5e9") throw new Error(`precipitate colour ${world.precipiteColor}`);
  // Adding excess ammonia must redissolve it into the deep-blue complex.
  const complexed = await scenario({ cuso4: 2, naoh: 5, nh3: 12 });
  if (complexed.world.precipite >= world.precipite) {
    throw new Error("ammonia did not redissolve the copper hydroxide");
  }
  if (!complexed.world.cuComplex) throw new Error("[Cu(NH3)4]2+ not flagged");
  if (complexed.world.liquidHex !== "#1e3a8a") {
    throw new Error(`complex colour ${complexed.world.liquidHex}, expected royal blue`);
  }
});

suite.test("the manometer follows CO2 and relaxes back to atmosphere", async () => {
  const peak = await scenario({ nahco3: 2, hcl: 2 }, 0, 3);
  if (peak.world.pression <= 105) throw new Error(`pressure ${peak.world.pression} kPa did not rise`);
  const settled = await scenario({ nahco3: 2, hcl: 2 }, 0, 600);
  if (settled.world.pression < 100 || settled.world.pression > 130) {
    throw new Error(`pressure did not relax toward atmosphere: ${settled.world.pression} kPa`);
  }
  if (settled.world.pression >= peak.world.pression) {
    throw new Error("the manometer never came back down");
  }
});

suite.test("the indicator tracks the pH it is given", async () => {
  const acid = await scenario({ bbt: 1, hcl: 1 });
  const neutral = await scenario({ bbt: 1, hcl: 1, naoh: 1 });
  const basic = await scenario({ bbt: 1, naoh: 1 });
  if (acid.world.liquidHex !== "#eab308") throw new Error(`acidic BBT ${acid.world.liquidHex}`);
  if (neutral.world.liquidHex !== "#16a34a") throw new Error(`neutral BBT ${neutral.world.liquidHex}`);
  if (basic.world.liquidHex !== "#2563eb") throw new Error(`basic BBT ${basic.world.liquidHex}`);
});

suite.test("every instrument declared by the config reports a finite value", async () => {
  const { booted, measures } = await scenario({ hcl: 1, naoh: 1, cuso4: 1 });
  for (const metric of booted.config.metrics) {
    const v = measures[metric.source];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      throw new Error(`instrument "${metric.id}" reads "${metric.source}" which reports ${v}`);
    }
  }
  const sources = booted.config.metrics.map((m) => m.source);
  for (const s of ["temp", "ph", "volume", "precipite", "pression"]) {
    if (!sources.includes(s)) throw new Error(`the ${s} instrument is missing from the config`);
  }
});

suite.test("the burner boils the flask and the ebullition law reports it", async () => {
  const booted = await bootLab("app-chimie");
  booted.lab.state.substances.hcl.count = 1;
  booted.lab.state.material.bruleur.strength = 100;
  booted.lab.setActive
    ? null
    : null;
  booted.lab.world.reset();
  for (let i = 0; i < 400; i++) booted.lab.step(1 / 60, booted.isActive);
  if (booted.lab.world.temp < 99) throw new Error(`the flask only reached ${booted.lab.world.temp} °C`);
  if (!booted.lab.world.boiling) throw new Error("the ebullition law did not report boiling");
});
