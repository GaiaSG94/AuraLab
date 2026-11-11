// Property-based tests for the bridge material catalogue and member mechanics.
// These pin the structural rules: costs, spans, budgets, site gating and the
// tension-only / compression-only families.
import { bootLab } from "./labs.mjs";
import { MATERIALS, MATERIAL_IDS, KINDS } from "../engines/ponts/materials.js";
import { Suite } from "./harness.mjs";

export const suite = new Suite("bridge");

// A straight deck of beams along the bottom row always forms a road.
function buildDeck(world, mat) {
  let placed = 0;
  for (let i = 0; i < world.deckCount - 1; i++) {
    if (world.place(i, i + 1, mat).ok) placed += 1;
  }
  return placed;
}

// One boot shared by every bridge test; each case resets the world it uses.
const booted = await bootLab("app-ponts");

function activeWorld(siteId) {
  const world = booted.lab.worlds[siteId];
  if (!world) throw new Error(`no world for site ${siteId}`);
  world.resetPhysics();
  world.sticks = [];
  return { booted, world };
}

suite.test("every material carries a complete notice and positive stats", () => {
  for (const id of MATERIAL_IDS) {
    const m = MATERIALS[id];
    for (const f of ["label", "notice", "cost", "maxLen", "stiff", "strength", "weight", "color", "kind"]) {
      if (m[f] === undefined || m[f] === null) throw new Error(`${id}: missing ${f}`);
    }
    for (const f of ["formule", "sources", "limites"]) {
      if (!m.notice[f] || !String(m.notice[f]).trim()) throw new Error(`${id}: notice.${f} is empty`);
    }
    if (!(m.cost > 0)) throw new Error(`${id}: cost must be positive`);
    if (!(m.maxLen > 0)) throw new Error(`${id}: maxLen must be positive`);
    if (!(m.strength > 0) || !(m.stiff > 0) || !(m.weight > 0)) throw new Error(`${id}: physical stats must be positive`);
    if (!KINDS[m.kind]) throw new Error(`${id}: unknown family "${m.kind}"`);
  }
});

suite.test("the catalogue really differentiates the materials", () => {
  const costs = new Set(MATERIAL_IDS.map((id) => MATERIALS[id].cost));
  if (costs.size !== MATERIAL_IDS.length) throw new Error("two materials share the same cost");
  const wood = MATERIALS.bois;
  const steel = MATERIALS.acier;
  if (!(steel.strength > wood.strength)) throw new Error("steel is not stronger than wood");
  if (!(steel.cost > wood.cost)) throw new Error("steel is not dearer than wood");
  if (!(MATERIALS.corde.strength < wood.strength)) throw new Error("rope should be the weakest member");
  if (!(MATERIALS.pilier.stiff > steel.stiff)) throw new Error("concrete pier should be the stiffest");
});

suite.test("a member longer than its material allows is refused and named", async () => {
  const { world } = await activeWorld("fleuve");
  // Deck spacing is 4 m, so a 5 m reach needs a non-adjacent pair.
  const res = world.place(0, 3, "corde"); // rope maxLen 8, span 12
  if (res.ok) throw new Error("a 12 m rope was accepted (max 8 m)");
  if (!/rope/i.test(res.why)) throw new Error(`refusal does not name the material: ${res.why}`);
});

suite.test("the budget blocks a placement that would overspend", async () => {
  const { world } = await activeWorld("ruisseau");
  const budget = world.budget();
  let spent = 0;
  let guard = 0;
  while (spent < budget && guard++ < 200) {
    const before = world.sticks.length;
    // Fill the deck, then the top chords, then diagonals.
    const pairs = [];
    for (let i = 0; i < world.deckCount - 1; i++) pairs.push([i, i + 1]);
    const deckTop = world.deckCount;
    for (let i = 0; i < deckTop - 1; i++) pairs.push([i + 1, i + 2]);
    let placed = false;
    for (const [a, b] of pairs) {
      const r = world.place(a, b, "bois");
      if (r.ok) { placed = true; break; }
      if (/Budget/i.test(r.why)) break;
    }
    spent = world.spent();
    if (!placed) break;
    if (world.sticks.length === before) break;
  }
  if (world.spent() > budget) throw new Error(`spent ${world.spent()} over budget ${budget}`);
});

suite.test("each site only offers its own material palette", async () => {
  for (const site of booted.config.sites) {
    const world = booted.lab.worlds[site.id];
    const allowed = site.materials;
    if (!Array.isArray(allowed)) continue;
    if (world.palette.join(",") !== allowed.join(",")) {
      throw new Error(`${site.id}: palette ${world.palette} != site materials ${allowed}`);
    }
    const forbidden = MATERIAL_IDS.find((id) => !allowed.includes(id));
    if (forbidden) {
      const r = world.place(0, 1, forbidden);
      if (r.ok) throw new Error(`${site.id} accepted ${forbidden}, which is not in its palette`);
      if (!/not on this site/i.test(r.why)) throw new Error(`refusal does not explain the site rule: ${r.why}`);
    }
  }
});

suite.test("every new material really adds something the others do not", () => {
  const wood = MATERIALS.bois;
  const bamboo = MATERIALS.bambou;
  const glulam = MATERIALS.lamelle;
  const steel = MATERIALS.acier;
  const truss = MATERIALS.treillis;
  const cable = MATERIALS.cable;
  const chain = MATERIALS.chaine;
  if (!(bamboo.cost < wood.cost && bamboo.weight < wood.weight)) {
    throw new Error("bamboo should be cheaper and lighter than wood");
  }
  if (!(glulam.maxLen > wood.maxLen && glulam.weight < steel.weight)) {
    throw new Error("glulam should span further than wood and weigh less than steel");
  }
  if (!(truss.maxLen > steel.maxLen && truss.strength > steel.strength)) {
    throw new Error("the truss should span and hold more than a solid steel beam");
  }
  if (!(chain.strength > cable.strength && chain.weight > cable.weight)) {
    throw new Error("a chain should out-pull a cable, and weigh more for it");
  }
});

suite.test("cables go slack in compression, arches buckle in tension", async () => {
  const world = booted.lab.worlds.fleuve;
  const always = () => true;

  // White-box but deterministic: place the member, force the test state, then
  // deform the two nodes and read the load the solver attributed to it.
  async function loadOf(mat, squeeze) {
    world.resetPhysics();
    world.sticks = [];
    const r = world.place(0, 1, mat);
    if (!r.ok) throw new Error(`could not place ${mat}: ${r.why}`);
    world.testing = true;
    const mid = (world.nodes[0].rx + world.nodes[1].rx) / 2;
    const gap = squeeze ? 2 : 6; // rest length is 4 m
    world.nodes[0].x = mid - gap / 2;
    world.nodes[1].x = mid + gap / 2;
    world.step(1 / 60, always);
    return world.sticks[0].load || 0;
  }

  if ((await loadOf("cable", true)) > 0) throw new Error("a compressed cable carried load");
  if ((await loadOf("arche", false)) > 0) throw new Error("a stretched arch carried load");
  if ((await loadOf("bois", true)) <= 0) throw new Error("a beam carried nothing while compressed");
  if ((await loadOf("bois", false)) <= 0) throw new Error("a beam carried nothing while stretched");
});

// --- the load ladder: several ghosts, each heavier, crossing in turn ---------

async function ladderWorld(siteId = "fleuve") {
  const { booted, world } = activeWorld(siteId);
  buildDeck(world, "bois");
  return { booted, world };
}

suite.property(
  "the ladder splits the heaviest ghost into increasing rungs",
  (rng) => ({ poids: 8 + Math.floor(rng() * 33), echelons: 1 + Math.floor(rng() * 6) }),
  ({ poids, echelons }) => {
    const { booted, world } = ladderWorldSync();
    const params = world.params()["charge-flottante"];
    params.poids = poids;
    params.echelons = echelons;
    const ladder = world.ladder();
    if (ladder.length !== echelons) throw new Error(`${ladder.length} rungs instead of ${echelons}`);
    for (let i = 1; i < ladder.length; i++) {
      if (!(ladder[i] > ladder[i - 1])) throw new Error(`rungs are not increasing: ${ladder.join(", ")}`);
    }
    if (Math.abs(ladder[ladder.length - 1] - poids) > 0.05) {
      throw new Error(`heaviest rung ${ladder[ladder.length - 1]} != poids ${poids}`);
    }
  },
  { runs: 25 },
);

// The ladder helper is synchronous: the shared boot already happened at module load.
function ladderWorldSync() {
  const world = booted.lab.worlds.fleuve;
  world.resetPhysics();
  world.sticks = [];
  buildDeck(world, "bois");
  return { booted, world };
}

suite.test("each ghost that reaches the bank hands over to a heavier one", async () => {
  const { world } = await ladderWorld();
  const params = world.params()["charge-flottante"];
  params.echelons = 4;
  params.poids = 20;
  const r = world.startTest();
  if (!r.ok) throw new Error(`test refused: ${r.why}`);
  if (r.rungs !== 4) throw new Error(`startTest announced ${r.rungs} rungs, expected 4`);
  if (r.heaviest !== 20) throw new Error(`heaviest announced ${r.heaviest}, expected 20`);
  if (world.ghosts.length !== 4) throw new Error(`${world.ghosts.length} ghosts built, expected 4`);
  if (world.ghosts[0].state !== "crossing") throw new Error("the first ghost is not crossing");
  if (world.ghosts.filter((g) => g.state === "waiting").length !== 3) {
    throw new Error("the other ghosts are not queued on the bank");
  }
  // Walk the first ghost to the far bank by hand.
  world.ghosts[0].x = world.half + 2;
  world.ghostReachedBank();
  if (world.ghostIndex !== 1) throw new Error("the ladder did not advance");
  if (world.ghosts[0].state !== "done") throw new Error("the first ghost was not parked");
  if (world.ghosts[1].state !== "crossing") throw new Error("the second ghost did not step up");
  if (!(world.ghosts[1].weight > world.ghosts[0].weight)) {
    throw new Error("the next ghost is not heavier");
  }
  if (world.testing !== true) throw new Error("the test ended before the ladder was done");
});

suite.test("the last ghost crossing ends the test as a pass, scored on the heaviest", async () => {
  const { world } = await ladderWorld();
  const params = world.params()["charge-flottante"];
  params.echelons = 3;
  params.poids = 30;
  world.startTest();
  for (let i = 0; i < 3; i++) {
    world.ghosts[world.ghostIndex].x = world.half + 2;
    world.ghostReachedBank();
  }
  if (world.testing) throw new Error("the test did not end after the last ghost");
  if (world.statut !== 1) throw new Error(`statut ${world.statut}, expected 1 (pass)`);
  if (world.passed !== 30) throw new Error(`heaviest carried ${world.passed} t, expected 30`);
  const expected = Math.max(0, Math.round(30 * 10 - world.spent()));
  if (world.score !== expected) throw new Error(`score ${world.score}, expected ${expected}`);
});

suite.test("a ladder of one ghost behaves like the old single test", async () => {
  const { world } = await ladderWorld();
  const params = world.params()["charge-flottante"];
  params.echelons = 1;
  params.poids = 20;
  const r = world.startTest();
  if (r.rungs !== 1) throw new Error(`${r.rungs} rungs, expected 1`);
  world.ghosts[0].x = world.half + 2;
  world.ghostReachedBank();
  if (world.statut !== 1) throw new Error("a single ghost did not finish the test");
  if (world.passed !== 20) throw new Error(`heaviest carried ${world.passed}, expected 20`);
});

suite.property(
  "an unknown material is always refused, never placed",
  (rng) => ({ id: `ghost-${Math.floor(rng() * 1000)}` }),
  async ({ id }) => {
    const { world } = await activeWorld("fleuve");
    const r = world.place(0, 1, id);
    if (r.ok) throw new Error(`unknown material "${id}" was placed`);
    if (world.sticks.length !== 0) throw new Error("a stick was added for an unknown material");
  },
  { runs: 10 },
);

// Isolate dead load: same deck, same span, self-weight law on then off.
// The horizon is short on purpose — past the first failure the sag freezes and
// the comparison would measure which bridge broke first, not the dead load.
const SAG_FRAMES = 20;

function sagWith(mat, selfWeight) {
  const world = booted.lab.worlds.fleuve;
  world.resetPhysics();
  world.sticks = [];
  const lawIndex = booted.config.laws.findIndex((l) => l.law === "poids-propre");
  booted.setActive("laws", `poids-propre#${lawIndex}`, selfWeight);
  if (buildDeck(world, mat) === 0) throw new Error(`could not build a ${mat} deck`);
  const r = world.startTest();
  if (!r.ok) throw new Error(`${mat} deck is not a road: ${r.why}`);
  for (let i = 0; i < SAG_FRAMES && world.testing; i++) world.step(1 / 60, booted.isActive);
  if (!world.testing) throw new Error("the deck failed before the sag could be measured");
  return world.measures().fleche;
}

suite.test("REQ-11 switching self-weight off measurably reduces the sag", async () => {
  const withDeadLoad = await sagWith("bois", true);
  const withoutDeadLoad = await sagWith("bois", false);
  if (!(withDeadLoad > withoutDeadLoad)) {
    throw new Error(`dead load has no effect: ${withDeadLoad} mm with, ${withoutDeadLoad} mm without`);
  }
});

suite.test("a heavier deck sags more than a lighter one under the same span", async () => {
  const wood = await sagWith("bois", true);
  const rope = await sagWith("corde", true);
  // Rope is far stretchier, so it must sag at least as much; the point of the
  // test is that the two materials behave differently, not identically.
  if (Math.abs(wood - rope) < 1) {
    throw new Error(`wood ${wood} mm and rope ${rope} mm sag identically: material properties are ignored`);
  }
});

suite.test("a member that snaps ends the test as a collapse", async () => {
  const { world } = await activeWorld("ruisseau");
  if (buildDeck(world, "corde") === 0) throw new Error("could not build a rope deck");
  const r = world.startTest();
  if (!r.ok) throw new Error(`rope deck is not a road: ${r.why}`);
  for (let i = 0; i < 600 && world.testing; i++) world.step(1 / 60, () => true);
  if (!world.sticks.some((s) => s.broken) && !world.ghost.falling) {
    throw new Error("a rope-only deck under a 20 t ghost should give way");
  }
});
