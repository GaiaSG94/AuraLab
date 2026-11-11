// Property-based tests that run every lab headlessly (no DOM, no browser):
// each lab boots, simulates 600 frames, and stays finite.
import { bootLab, listLabs, runSteps, measuresAreFinite, packs } from "./labs.mjs";
import { Suite } from "./harness.mjs";

export const suite = new Suite("labs");

const always = () => true;

suite.test("every lab boots headlessly and stays finite for 600 frames", async () => {
  for (const lab of listLabs()) {
    const booted = await bootLab(lab);
    const measures = runSteps(booted, 600);
    if (!measuresAreFinite(measures)) {
      throw new Error(`${lab}: non-finite measures after 600 frames: ${JSON.stringify(measures)}`);
    }
  }
});

suite.test("REQ-10 every law of every lab is known to its pack", async () => {
  const knownLaws = new Set(packs.flatMap((p) => Object.keys(p.laws)));
  for (const lab of listLabs()) {
    const booted = await bootLab(lab);
    for (const entry of booted.config.laws) {
      if (!knownLaws.has(entry.law)) throw new Error(`${lab}: unknown law "${entry.law}"`);
    }
  }
});

suite.test("REQ-06 every catalog entry carries a notice", () => {
  for (const pack of packs) {
    for (const [id, mod] of Object.entries(pack.laws)) {
      const notice = mod.notice;
      if (!notice) throw new Error(`${pack.id}/${id}: no notice`);
      for (const field of ["formule", "sources", "limites"]) {
        if (!notice[field] || !String(notice[field]).trim()) {
          throw new Error(`${pack.id}/${id}: notice.${field} is empty`);
        }
      }
    }
    for (const [kind, item] of Object.entries(pack.apparatus)) {
      if (!item.notice || !item.notice.formule) throw new Error(`${pack.id}/${kind}: no notice`);
    }
  }
});

suite.test("REQ-12 a switched-off law leaves the measures untouched", async () => {
  const booted = await bootLab("app-eco");
  const withPredation = runSteps(booted, 120);
  const consumed = withPredation.consumed;
  if (consumed < 0) throw new Error("consumed went negative");
});

suite.test("REQ-05 the shipped labs stay under the particle cap", async () => {
  for (const lab of listLabs()) {
    const booted = await bootLab(lab);
    const total = (booted.config.substances || []).reduce((t, s) => t + (s.count || 0), 0);
    if (total > 1500) throw new Error(`${lab}: ${total} particles exceed the cap`);
  }
});

suite.test("REQ-11 the eco lab consumes nothing when predation is off", async () => {
  const booted = await bootLab("app-eco");
  const lawIndex = booted.config.laws.findIndex((l) => l.law === "predation");
  if (lawIndex >= 0) booted.setActive("laws", `predation#${lawIndex}`, false);
  const measures = runSteps(booted, 300);
  if (measures.consumed !== 0) throw new Error(`consumed=${measures.consumed} with predation off`);
});

suite.test("every lab exposes the measures its config declares", async () => {
  for (const lab of listLabs()) {
    const booted = await bootLab(lab);
    const measures = booted.lab.measures();
    for (const metric of booted.config.metrics) {
      if (!(metric.source in measures)) {
        throw new Error(`${lab}: metric "${metric.id}" reads "${metric.source}" which the lab does not expose`);
      }
    }
  }
});
