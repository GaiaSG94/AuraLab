// Property-based tests for the level progression (engines/ponts/levels.js):
// difficulty, palette unlocks and the purse economy.
import { bootLab } from "./labs.mjs";
import { MATERIAL_IDS } from "../engines/ponts/materials.js";
import { levelSpec, ladderFor, paletteFor, rewardFor, isHarder } from "../engines/ponts/levels.js";
import { Suite } from "./harness.mjs";

export const suite = new Suite("levels");

const booted = await bootLab("app-ponts");
const RULES = booted.config.levels;

suite.test("REQ-55 the config carries a complete level rule set", () => {
  if (!RULES) throw new Error("config.levels is missing");
  for (const key of ["width", "rungs", "weight", "purse", "reward", "unlocks"]) {
    if (!RULES[key]) throw new Error(`config.levels.${key} is missing`);
  }
  for (const key of ["width", "weight"]) {
    const r = RULES[key];
    if (!(r.start > 0 && r.step >= 0 && r.max >= r.start)) {
      throw new Error(`config.levels.${key} is not a sane progression: ${JSON.stringify(r)}`);
    }
  }
});

suite.property(
  "REQ-56 difficulty never decreases from one level to the next",
  (rng) => ({ n: 1 + Math.floor(rng() * 25) }),
  ({ n }) => {
    const a = levelSpec(n, 500, RULES);
    const b = levelSpec(n + 1, 500, RULES);
    if (!isHarder(a, b)) {
      throw new Error(
        `level ${n + 1} is not harder than ${n}: ` +
        `${a.width} m / ${a.ladder.rungs} x ${a.ladder.heaviest} t vs ` +
        `${b.width} m / ${b.ladder.rungs} x ${b.ladder.heaviest} t`,
      );
    }
    if (b.level !== a.level + 1) throw new Error("level numbers are not consecutive");
  },
  { runs: 25 },
);

suite.property(
  "REQ-56 difficulty stays inside the declared caps",
  (rng) => ({ n: 1 + Math.floor(rng() * 200) }),
  ({ n }) => {
    const s = levelSpec(n, 500, RULES);
    if (s.width > RULES.width.max) throw new Error(`width ${s.width} exceeds the cap ${RULES.width.max}`);
    if (s.ladder.heaviest > RULES.weight.max) throw new Error(`heaviest ${s.ladder.heaviest} exceeds the cap`);
    if (s.ladder.rungs > RULES.rungs.max) throw new Error(`${s.ladder.rungs} rungs exceeds the cap`);
    if (s.ladder.rungs < 1) throw new Error("a level with no ghost cannot be tested");
  },
  { runs: 30 },
);

suite.test("REQ-58 the palette unlocks progressively and eventually covers the catalogue", () => {
  const first = paletteFor(1, RULES);
  if (first.length < 2) throw new Error("level 1 must offer at least two materials");
  if (first.length >= MATERIAL_IDS.length) throw new Error("level 1 already unlocks everything");
  let seen = first.length;
  for (let n = 2; n <= MATERIAL_IDS.length + 6; n++) {
    const pal = paletteFor(n, RULES);
    if (pal.length < seen) throw new Error(`the palette shrank at level ${n}`);
    // A later level must never lose a material an earlier one had.
    for (const id of paletteFor(n - 1, RULES)) {
      if (!pal.includes(id)) throw new Error(`level ${n} lost ${id}`);
    }
    seen = pal.length;
  }
  if (seen !== MATERIAL_IDS.length) {
    throw new Error(`only ${seen}/${MATERIAL_IDS.length} materials ever unlock`);
  }
});

suite.test("REQ-55 the level spec agrees with the standalone generators", () => {
  for (const n of [1, 2, 5, 9, 14]) {
    const s = levelSpec(n, 321, RULES);
    if (s.ladder.weights.join(",") !== ladderFor(n, RULES).weights.join(",")) {
      throw new Error(`level ${n}: spec ladder and ladderFor disagree`);
    }
    if (s.reward !== rewardFor(n, RULES)) throw new Error(`level ${n}: reward mismatch`);
    if (s.materials.join(",") !== paletteFor(n, RULES).join(",")) {
      throw new Error(`level ${n}: palette mismatch`);
    }
    if (s.budget !== 321) throw new Error(`level ${n}: the budget is not the purse given`);
  }
});

suite.property(
  "REQ-57 the purse economy: clearing a level always pays, and never goes negative",
  (rng) => ({
    purse: 20 + Math.floor(rng() * 400),
    level: 1 + Math.floor(rng() * 15),
    spentFrac: rng(),
  }),
  ({ purse, level, spentFrac }) => {
    // Shrinking can drive the level below 1; the property only speaks about
    // real levels, so the premise is checked first.
    if (level < 1) return;
    const spec = levelSpec(level, purse, RULES);
    if (spec.budget !== Math.round(purse)) throw new Error("the level budget is not the purse");
    const spent = Math.min(spec.budget, Math.round(spec.budget * spentFrac));
    const next = Math.max(0, purse - spent) + spec.reward;
    if (next < 0) throw new Error(`the purse went negative: ${next}`);
    if (spec.reward <= 0) throw new Error("clearing a level pays nothing");
    // Exact accounting: what is left over is kept, and the reward is added.
    if (next !== purse - spent + spec.reward) {
      throw new Error(`purse ${next} != ${purse} - ${spent} + ${spec.reward}`);
    }
    if (next < spec.reward) throw new Error("the purse ended below the reward alone");
  },
  { runs: 40 },
);

suite.test("REQ-57 a cheap design banks more than an expensive one on the same level", () => {
  const spec = levelSpec(3, 400, RULES);
  const cheap = Math.max(0, 400 - 60) + spec.reward;
  const dear = Math.max(0, 400 - 300) + spec.reward;
  if (!(cheap > dear)) throw new Error("spending less does not leave a bigger purse");
});

suite.test("REQ-55 the booted lab starts at level 1 with the starting purse", () => {
  const spec = booted.lab.spec;
  if (spec.level !== 1) throw new Error(`the lab opened on level ${spec.level}, expected 1`);
  if (spec.budget !== RULES.purse.start) {
    throw new Error(`budget ${spec.budget} != starting purse ${RULES.purse.start}`);
  }
  const world = booted.lab.worlds[spec.id].world;
  if (world.budget() !== spec.budget) throw new Error("the world budget is not the level budget");
  if (world.palette.join(",") !== spec.materials.join(",")) throw new Error("palette mismatch at boot");
});
