// Bridge Lab level progression.
//
// A level is a contract: how wide the gap is, how many ghosts cross, how heavy
// the last one is, which materials the yard delivers, and what clearing it pays.
// Difficulty only ever grows with the level number, so a saved game can be
// resumed and a score compared across runs.
//
// DOM-free: the same generator drives the browser, the tests and the MCP server.
import { MATERIAL_IDS } from "./materials.js";

// Unlock order: cheap and forgiving first, specialised and dear last.
export const UNLOCK_ORDER = ["bois", "corde", "cable", "bambou", "lamelle", "acier", "chaine", "treillis", "arche", "pilier"];

export const LEVEL_RULES = {
  width: { start: 12, step: 4, max: 44 },
  rungs: { start: 2, step: 1, max: 6, every: 2 },
  weight: { start: 8, step: 5, max: 45 },
  purse: { start: 90, step: 45, max: 900 },
  reward: { perTon: 12, min: 40 },
  unlocks: { start: 3, every: 1 },
};

function grow(rule, level) {
  const v = rule.start + rule.step * (level - 1);
  return Math.min(rule.max, Math.round(v * 10) / 10);
}

// The load ladder of a level: `rungs` ghosts from heaviest/rungs up to heaviest.
export function ladderFor(level, rules = LEVEL_RULES) {
  const heaviest = grow(rules.weight, level);
  const rungs = Math.max(1, Math.round(rules.rungs.start + Math.floor((level - 1) / rules.rungs.every)));
  const n = Math.min(rules.rungs.max, rungs);
  return {
    heaviest,
    rungs: n,
    weights: Array.from({ length: n }, (_, i) => Math.round(((heaviest * (i + 1)) / n) * 10) / 10),
  };
}

// Materials the yard delivers at this level.
export function paletteFor(level, rules = LEVEL_RULES) {
  const count = Math.min(
    MATERIAL_IDS.length,
    rules.unlocks.start + Math.floor((level - 1) / rules.unlocks.every),
  );
  const n = Math.max(1, Math.min(MATERIAL_IDS.length, count));
  return UNLOCK_ORDER.slice(0, n).filter((id) => MATERIAL_IDS.includes(id));
}

// What clearing the level pays: the whole ladder carried, paid per tonne.
export function rewardFor(level, rules = LEVEL_RULES) {
  const ladder = ladderFor(level, rules);
  const carried = ladder.weights.reduce((t, w) => t + w, 0);
  return Math.max(rules.reward.min, Math.round(carried * rules.reward.perTon));
}

// One level, fully described. `budget` is what the player may spend on it.
export function levelSpec(level, purse, rules = LEVEL_RULES) {
  const n = Math.max(1, Math.round(level));
  const ladder = ladderFor(n, rules);
  return {
    id: `level-${n}`,
    level: n,
    label: `Level ${n}`,
    width: grow(rules.width, n),
    budget: Math.max(0, Math.round(purse)),
    materials: paletteFor(n, rules),
    ladder,
    reward: rewardFor(n, rules),
  };
}

// Bank a cleared level: what the design left in the purse plus the reward.
// The caller must gate this on a pending flag, or a replayed level pays twice.
export function bankPurse(purse, spent, reward) {
  const left = Math.max(0, Math.round(purse) - Math.max(0, Math.round(spent)));
  return left + Math.max(0, Math.round(reward));
}

// Difficulty must never decrease: wider gap, more ghosts, heavier last ghost.
export function isHarder(a, b) {
  return b.width >= a.width && b.ladder.rungs >= a.ladder.rungs && b.ladder.heaviest >= a.ladder.heaviest;
}

// A level is cleared when every ghost of its ladder crossed and nothing broke.
export function cleared(world) {
  return world.statut === 1 && world.ghosts.length > 0 && world.ghostIndex >= world.ghosts.length - 1;
}
