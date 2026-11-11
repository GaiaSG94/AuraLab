// Property-based tests for the simulation core (engines/particles/world.js)
// and for the "one law, one switch" behaviour the specs require.
import { createWorld } from "../engines/particles/world.js";
import { Suite } from "./harness.mjs";

export const suite = new Suite("simulation");

function makeDef(overrides = {}) {
  return {
    substances: [
      { id: "a", count: 12, color: "#9ad1ff", radius: 3, mass: 1, speed: 40 },
      { id: "b", count: 6, color: "#e8e6e1", radius: 3, mass: 1, speed: 40 },
    ],
    material: [
      { id: "star", kind: "attractor", x: 0.5, y: 0.5, strength: 120, radius: 20, color: "#ffffff" },
    ],
    laws: [],
    bounds: "wrap",
    ...overrides,
  };
}

function law(id, mod) {
  return { id: `${id}#0`, mod, targetIds: null, params: { ...mod.defaults } };
}

const always = () => true;
const never = () => false;

suite.test("REQ-11 a switched-off law has no effect", () => {
  let calls = 0;
  const counter = { id: "counter", defaults: {}, apply() { calls += 1; } };
  const world = createWorld(makeDef({ laws: [law("counter", counter)] }));
  world.step(1 / 60, () => false);
  if (calls !== 0) throw new Error(`the law ran ${calls} time(s) while switched off`);
  world.step(1 / 60, always);
  if (calls !== 1) throw new Error(`the law ran ${calls} time(s) instead of 1`);
});

suite.test("REQ-10 laws run in list order", () => {
  const order = [];
  const mk = (id) => ({ id, defaults: {}, apply() { order.push(id); } });
  const world = createWorld(makeDef({ laws: [law("first", mk("first")), law("second", mk("second"))] }));
  world.step(1 / 60, always);
  if (order.join(",") !== "first,second") throw new Error(`order was ${order.join(",")}`);
});

suite.test("REQ-12 a switched-off substance is frozen", () => {
  const world = createWorld(makeDef());
  const before = world.particles.map((p) => ({ x: p.x, y: p.y }));
  world.step(1 / 60, (cat, id) => !(cat === "substances" && id === "a"));
  const moved = world.particles
    .map((p, i) => (Math.abs(p.x - before[i].x) > 1e-9 || Math.abs(p.y - before[i].y) > 1e-9 ? i : -1))
    .filter((i) => i >= 0);
  const groupOf = (i) => world.particles[i].e;
  const frozenMoved = moved.filter((i) => groupOf(i) === 0);
  if (frozenMoved.length > 0) throw new Error(`${frozenMoved.length} frozen particle(s) moved`);
});

suite.test("REQ-13 a switched-off attractor exerts no force", () => {
  const world = createWorld(makeDef());
  const before = world.particles.map((p) => ({ vx: p.vx, vy: p.vy }));
  world.step(1 / 60, (cat, id) => !(cat === "material" && id === "star"));
  const accelerated = world.particles.some((p, i) => Math.abs(p.vx - before[i].vx) > 1e-9);
  if (accelerated) throw new Error("a disabled attractor still moved particles");
});

suite.property(
  "REQ-14 particle speed never exceeds the cap",
  (rng) => {
    const defs = makeDef();
    defs.material[0].strength = 5000 * (Math.floor(rng() * 2) ? 1 : -1);
    defs.substances[0].speed = 600 * (Math.floor(rng() * 2) ? 1 : 0);
    defs.substances[0].mass = 0.1 + Math.floor(rng() * 10) / 10;
    defs.laws = [];
    return defs;
  },
  (defs) => {
    const world = createWorld(defs);
    for (let i = 0; i < 60; i++) world.step(1 / 60, always);
    for (const p of world.particles) {
      const speed = Math.hypot(p.vx, p.vy);
      if (!Number.isFinite(speed)) throw new Error("a particle velocity went non-finite");
      if (speed > 900 + 1e-6) throw new Error(`speed ${speed.toFixed(2)} exceeds the 900 cap`);
    }
  },
  { runs: 20 },
);

suite.property(
  "REQ-24 the particle count follows the declared count",
  (rng) => {
    const defs = makeDef();
    defs.substances[0].count = Math.floor(rng() * 40);
    defs.substances[1].count = Math.floor(rng() * 20);
    return defs;
  },
  (defs) => {
    const world = createWorld(defs);
    const counts = world.counts();
    if (counts[0] !== defs.substances[0].count) throw new Error(`a=${counts[0]} != ${defs.substances[0].count}`);
    if (counts[1] !== defs.substances[1].count) throw new Error(`b=${counts[1]} != ${defs.substances[1].count}`);
    defs.substances[0].count = Math.max(0, defs.substances[0].count - 5);
    world.syncCounts();
    const after = world.counts();
    if (after[0] !== defs.substances[0].count) throw new Error(`after resync a=${after[0]}`);
  },
  { runs: 20 },
);

suite.property(
  "REQ-26 the world stays finite under extreme sliders",
  (rng) => {
    const defs = makeDef();
    defs.material[0].strength = (Math.floor(rng() * 2) ? 1 : -1) * 5000;
    defs.substances.forEach((s) => {
      s.speed = Math.floor(rng() * 600);
      s.mass = 0.1 + Math.floor(rng() * 100) / 10;
    });
    defs.laws = [];
    return defs;
  },
  (defs) => {
    const world = createWorld(defs);
    for (let i = 0; i < 120; i++) world.step(1 / 60, always);
    for (const p of world.particles) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new Error("a particle position went non-finite");
      if (!Number.isFinite(p.vx) || !Number.isFinite(p.vy)) throw new Error("a particle velocity went non-finite");
    }
  },
  { runs: 25 },
);
