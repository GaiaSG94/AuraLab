// Property-based tests for the bridge material catalogue, the member mechanics
// and the level progression. These pin the structural rules (costs, spans,
// budgets, tension/compression families) and the economy (purse, rewards).
import { bootLab } from "./labs.mjs";
import { MATERIALS, MATERIAL_IDS, KINDS } from "../engines/ponts/materials.js";
import { levelSpec, ladderFor, paletteFor, rewardFor, isHarder } from "../engines/ponts/levels.js";
import { Suite } from "./harness.mjs";

export const suite = new Suite("bridge");

// One boot shared by every test; each case resets the world it uses.
const booted = await bootLab("app-ponts");
const RULES = booted.config.levels;

function world() {
  const entry = booted.lab.worlds[booted.lab.spec.id];
  if (!entry || !entry.world) throw new Error(`no world for ${booted.lab.spec.id}`);
  return entry.world;
}

function fresh() {
  const w = world();
  w.resetPhysics();
  w.sticks = [];
  return w;
}

// A straight deck of one material along the bottom row always forms a road.
function buildDeck(w, mat) {
  let placed = 0;
  for (let i = 0; i < w.deckCount - 1; i++) {
    if (w.place(i, i + 1, mat).ok) placed += 1;
  }
  return placed;
}

// --- catalogue ------------------------------------------------------------

suite.test("every material carries a complete notice and positive stats", () => {
  for (const id of MATERIAL_IDS) {
    const m = MATERIALS[id];
    for (const f of ["label", "notice", "cost", "maxLen", "stiff", "strength", "weight", "color", "kind"]) {
      if (m[f] === undefined || m[f] === null) throw new Error(`${id}: missing ${f}`);
    }
    for (const f of ["formule", "sources", "limites"]) {
      if (!m.notice[f] || !String(m.notice[f]).trim()) throw new Error(`${id}: notice.${f} is empty`);
    }
    if (!(m.cost > 0) || !(m.maxLen > 0)) throw new Error(`${id}: cost and maxLen must be positive`);
    if (!(m.strength > 0) || !(m.stiff > 0) || !(m.weight > 0)) throw new Error(`${id}: physical stats must be positive`);
    if (!KINDS[m.kind]) throw new Error(`${id}: unknown family "${m.kind}"`);
  }
});

suite.test("the catalogue really differentiates the materials", () => {
  const costs = new Set(MATERIAL_IDS.map((id) => MATERIALS[id].cost));
  if (costs.size !== MATERIAL_IDS.length) throw new Error("two materials share the same cost");
  const { bois, acier, corde, pilier, bambou, lamelle, treillis, cable, chaine } = MATERIALS;
  if (!(acier.strength > bois.strength)) throw new Error("steel is not stronger than wood");
  if (!(acier.cost > bois.cost)) throw new Error("steel is not dearer than wood");
  if (!(corde.strength < bois.strength)) throw new Error("rope should be the weakest member");
  if (!(pilier.stiff > acier.stiff)) throw new Error("concrete pier should be the stiffest");
  if (!(bambou.cost < bois.cost && bambou.weight < bois.weight)) throw new Error("bamboo should be cheaper and lighter than wood");
  if (!(lamelle.maxLen > bois.maxLen && lamelle.weight < acier.weight)) throw new Error("glulam should span further than wood and weigh less than steel");
  if (!(treillis.maxLen > acier.maxLen && treillis.strength > acier.strength)) throw new Error("the truss should span and hold more than a solid steel beam");
  if (!(chaine.strength > cable.strength && chaine.weight > cable.weight)) throw new Error("a chain should out-pull a cable, and weigh more for it");
});

suite.property(
  "an unknown material is always refused, never placed",
  (rng) => ({ id: `ghost-${Math.floor(rng() * 1000)}` }),
  ({ id }) => {
    const w = fresh();
    const r = w.place(0, 1, id);
    if (r.ok) throw new Error(`unknown material "${id}" was placed`);
    if (w.sticks.length !== 0) throw new Error("a stick was added for an unknown material");
  },
  { runs: 10 },
);

// --- placement rules ------------------------------------------------------

suite.test("a member longer than its material allows is refused and named", () => {
  const w = fresh();
  const far = w.deckCount - 1;
  const res = w.place(0, far, "corde");
  if (res.ok) throw new Error("an over-long rope was accepted");
  if (!/rope/i.test(res.why)) throw new Error(`refusal does not name the material: ${res.why}`);
});

suite.test("the budget blocks a placement that would overspend", () => {
  const w = fresh();
  const budget = w.budget();
  for (let i = 0; i < w.deckCount + 40; i++) {
    const a = i % w.deckCount;
    const b = (i + 1) % w.deckCount;
    w.place(a, b, "bois");
  }
  if (w.spent() > budget) throw new Error(`spent ${w.spent()} over budget ${budget}`);
});

suite.test("each level only offers its own material palette", () => {
  const spec = booted.lab.spec;
  const w = world();
  if (w.palette.join(",") !== spec.materials.join(",")) {
    throw new Error(`${spec.id}: palette ${w.palette} != level materials ${spec.materials}`);
  }
  const forbidden = MATERIAL_IDS.find((id) => !spec.materials.includes(id));
  if (!forbidden) throw new Error("level 1 unlocks every material: progression is not testable");
  const r = w.place(0, 1, forbidden);
  if (r.ok) throw new Error(`${spec.id} accepted ${forbidden}, outside its palette`);
  if (!/not on this site/i.test(r.why)) throw new Error(`refusal does not explain the rule: ${r.why}`);
});

// --- member families ------------------------------------------------------

suite.test("cables go slack in compression, arches buckle in tension", () => {
  const w = fresh();
  const always = () => true;
  // Level 1 does not deliver every material yet; this test probes the solver's
  // family rule, not the palette, so the missing ones are allowed in by hand.
  for (const id of ["cable", "arche"]) {
    if (!w.palette.includes(id)) w.palette.push(id);
  }

  function loadOf(mat, gap) {
    w.resetPhysics();
    w.sticks = [];
    const r = w.place(0, 1, mat);
    if (!r.ok) throw new Error(`could not place ${mat}: ${r.why}`);
    w.testing = true;
    const mid = (w.nodes[0].rx + w.nodes[1].rx) / 2;
    w.nodes[0].x = mid - gap / 2;
    w.nodes[1].x = mid + gap / 2;
    w.step(1 / 60, always);
    return w.sticks[0].load || 0;
  }

  if (loadOf("cable", 2) > 0) throw new Error("a compressed cable carried load");
  if (loadOf("arche", 6) > 0) throw new Error("a stretched arch carried load");
  if (loadOf("bois", 2) <= 0) throw new Error("a beam carried nothing while compressed");
  if (loadOf("bois", 6) <= 0) throw new Error("a beam carried nothing while stretched");
  w.resetPhysics();
  w.sticks = [];
});

// --- load ladder ----------------------------------------------------------

suite.property(
  "the ladder splits the heaviest ghost into increasing rungs",
  (rng) => ({ level: 1 + Math.floor(rng() * 12) }),
  ({ level }) => {
    const w = fresh();
    const spec = levelSpec(level, 999, RULES);
    const charge = w.params()["charge-flottante"];
    charge.poids = spec.ladder.heaviest;
    charge.echelons = spec.ladder.rungs;
    const ladder = w.ladder();
    if (ladder.length !== spec.ladder.rungs) {
      throw new Error(`${ladder.length} rungs instead of ${spec.ladder.rungs}`);
    }
    for (let i = 1; i < ladder.length; i++) {
      if (!(ladder[i] > ladder[i - 1])) throw new Error(`rungs not increasing: ${ladder.join(", ")}`);
    }
    if (Math.abs(ladder[ladder.length - 1] - spec.ladder.heaviest) > 0.05) {
      throw new Error(`heaviest rung ${ladder[ladder.length - 1]} != ${spec.ladder.heaviest}`);
    }
  },
  { runs: 20 },
);

suite.test("each ghost that reaches the bank hands over to a heavier one", () => {
  const w = fresh();
  const charge = w.params()["charge-flottante"];
  charge.echelons = 4;
  charge.poids = 20;
  if (buildDeck(w, "bois") === 0) throw new Error("could not build a deck");
  const r = w.startTest();
  if (!r.ok) throw new Error(`test refused: ${r.why}`);
  if (r.rungs !== 4) throw new Error(`announced ${r.rungs} rungs, expected 4`);
  if (r.heaviest !== 20) throw new Error(`announced heaviest ${r.heaviest}, expected 20`);
  if (w.ghosts[0].state !== "crossing") throw new Error("the first ghost is not crossing");
  if (w.ghosts.filter((g) => g.state === "waiting").length !== 3) throw new Error("the others are not queued");
  w.ghosts[0].x = w.half + 2;
  w.ghostReachedBank();
  if (w.ghostIndex !== 1) throw new Error("the ladder did not advance");
  if (w.ghosts[0].state !== "done") throw new Error("the first ghost was not parked");
  if (w.ghosts[1].state !== "crossing") throw new Error("the second ghost did not step up");
  if (!(w.ghosts[1].weight > w.ghosts[0].weight)) throw new Error("the next ghost is not heavier");
  if (w.testing !== true) throw new Error("the test ended before the ladder was done");
});

suite.test("the last ghost crossing ends the test as a pass, scored on the heaviest", () => {
  const w = fresh();
  const charge = w.params()["charge-flottante"];
  charge.echelons = 3;
  charge.poids = 30;
  buildDeck(w, "bois");
  w.startTest();
  for (let i = 0; i < 3; i++) {
    w.ghosts[w.ghostIndex].x = w.half + 2;
    w.ghostReachedBank();
  }
  if (w.testing) throw new Error("the test did not end after the last ghost");
  if (w.statut !== 1) throw new Error(`statut ${w.statut}, expected 1 (pass)`);
  if (w.passed !== 30) throw new Error(`heaviest carried ${w.passed} t, expected 30`);
  const expected = Math.max(0, Math.round(30 * 10 - w.spent()));
  if (w.score !== expected) throw new Error(`score ${w.score}, expected ${expected}`);
});

suite.test("a ladder of one ghost behaves like the old single test", () => {
  const w = fresh();
  const charge = w.params()["charge-flottante"];
  charge.echelons = 1;
  charge.poids = 20;
  buildDeck(w, "bois");
  const r = w.startTest();
  if (r.rungs !== 1) throw new Error(`${r.rungs} rungs, expected 1`);
  w.ghosts[0].x = w.half + 2;
  w.ghostReachedBank();
  if (w.statut !== 1) throw new Error("a single ghost did not finish the test");
  if (w.passed !== 20) throw new Error(`heaviest carried ${w.passed}, expected 20`);
});

suite.test("a member that snaps ends the test as a collapse", () => {
  const w = fresh();
  const charge = w.params()["charge-flottante"];
  charge.echelons = 4;
  charge.poids = 40;
  if (buildDeck(w, "corde") === 0) throw new Error("could not build a rope deck");
  const r = w.startTest();
  if (!r.ok) throw new Error(`rope deck is not a road: ${r.why}`);
  for (let i = 0; i < 900 && w.testing; i++) w.step(1 / 60, () => true);
  if (!w.sticks.some((s) => s.broken) && !w.ghosts.some((g) => g.falling)) {
    throw new Error("a rope-only deck under a 40 t ladder should give way");
  }
});

// --- level progression ----------------------------------------------------

suite.property(
  "difficulty never decreases from one level to the next",
  (rng) => ({ n: 1 + Math.floor(rng() * 20) }),
  ({ n }) => {
    const a = levelSpec(n, 500, RULES);
    const b = levelSpec(n + 1, 500, RULES);
    if (!isHarder(a, b)) {
      throw new Error(`level ${n + 1} is easier than ${n}: ${a.width}m/${a.ladder.heaviest}t vs ${b.width}m/${b.ladder.heaviest}t`);
    }
    if (b.reward < a.reward) throw new Error(`level ${n + 1} pays less than ${n}`);
    if (paletteFor(n + 1, RULES).length < paletteFor(n, RULES).length) {
      throw new Error("the palette shrank between levels");
    }
  },
  { runs: 20 },
);

suite.test("the palette unlocks materials as the levels climb", () => {
  const first = paletteFor(1, RULES);
  if (first.length < 2) throw new Error("level 1 must offer at least two materials");
  if (first.length >= MATERIAL_IDS.length) throw new Error("level 1 already unlocks everything");
  let seen = first.length;
  for (let n = 2; n <= MATERIAL_IDS.length + 4; n++) {
    const pal = paletteFor(n, RULES);
    if (pal.length < seen) throw new Error(`palette shrank at level ${n}`);
    seen = pal.length;
  }
  if (seen !== MATERIAL_IDS.length) throw new Error(`only ${seen}/${MATERIAL_IDS.length} materials ever unlock`);
});

suite.test("the ladder of a level matches what its spec announces", () => {
  for (const n of [1, 3, 7]) {
    const spec = levelSpec(n, 500, RULES);
    const ladder = ladderFor(n, RULES);
    if (spec.ladder.weights.join(",") !== ladder.weights.join(",")) {
      throw new Error(`level ${n}: spec ladder and ladderFor disagree`);
    }
    if (spec.reward !== rewardFor(n, RULES)) throw new Error(`level ${n}: reward mismatch`);
  }
});

suite.property(
  "the purse economy never goes negative and always pays the reward",
  (rng) => ({
    purse: 40 + Math.floor(rng() * 300),
    level: 1 + Math.floor(rng() * 10),
    spentFrac: rng(),
  }),
  ({ purse, level, spentFrac }) => {
    const spec = levelSpec(level, purse, RULES);
    if (spec.budget !== Math.round(purse)) throw new Error("the level budget is not the purse");
    const spent = Math.min(spec.budget, Math.round(spec.budget * spentFrac));
    const next = Math.max(0, purse - spent) + spec.reward;
    if (next < 0) throw new Error(`purse went negative: ${next}`);
    if (next <= purse - spent) throw new Error("clearing a level paid nothing");
  },
  { runs: 30 },
);

// --- self-weight ----------------------------------------------------------

function sagWith(mat, selfWeight) {
  const w = fresh();
  const lawIndex = booted.config.laws.findIndex((l) => l.law === "poids-propre");
  booted.setActive("laws", `poids-propre#${lawIndex}`, selfWeight);
  if (buildDeck(w, mat) === 0) throw new Error(`could not build a ${mat} deck`);
  const r = w.startTest();
  if (!r.ok) throw new Error(`${mat} deck is not a road: ${r.why}`);
  for (let i = 0; i < 20 && w.testing; i++) w.step(1 / 60, booted.isActive);
  if (!w.testing) throw new Error("the deck failed before the sag could be measured");
  return w.measures().fleche;
}

suite.test("REQ-11 switching self-weight off measurably reduces the sag", () => {
  const withDeadLoad = sagWith("bois", true);
  const withoutDeadLoad = sagWith("bois", false);
  booted.setActive("laws", `poids-propre#${booted.config.laws.findIndex((l) => l.law === "poids-propre")}`, true);
  if (!(withDeadLoad > withoutDeadLoad)) {
    throw new Error(`dead load has no effect: ${withDeadLoad} mm with, ${withoutDeadLoad} mm without`);
  }
});

suite.test("a heavier deck sags differently from a lighter one on the same span", () => {
  const wood = sagWith("bois", true);
  const rope = sagWith("corde", true);
  if (Math.abs(wood - rope) < 1) {
    throw new Error(`wood ${wood} mm and rope ${rope} mm sag identically: material properties are ignored`);
  }
});
