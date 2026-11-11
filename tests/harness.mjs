// Minimal property-based testing harness (zero dependency).
// Seedable RNG + generated cases + shrinking, enough to state a property
// once and let it hunt for the counter-example on its own.
// Tests and properties run sequentially so a suite can share one booted lab.
import { mulberry32 } from "../engines/particles/world.js";

export function check(condition, message) {
  if (!condition) throw new Error(message || "check failed");
}

// Shrinkers: each returns a smaller variant of the value, or null.
// They stay conservative: an object is never emptied (that would destroy the
// very structure the property talks about) and only numbers get simplified.
const SHRINKERS = {
  number: (v) => {
    if (!Number.isFinite(v)) return 0;
    if (v === 0) return null;
    const candidates = [0, 1, Math.trunc(v), Math.round(v / 2)];
    return candidates.find((c) => c !== v && Number.isFinite(c)) ?? null;
  },
  string: (v) => (v.length > 1 ? v.slice(0, Math.floor(v.length / 2)) : null),
};

function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

// Simplify one numeric leaf at a time; shorten one array at a time.
function shrink(value) {
  if (typeof value === "number") {
    const s = SHRINKERS.number(value);
    return s === null ? [] : [s];
  }
  if (typeof value === "string") {
    const s = SHRINKERS.string(value);
    return s === null ? [] : [s];
  }
  if (Array.isArray(value)) {
    const out = [];
    if (value.length > 1) {
      const copy = value.slice();
      copy.pop();
      out.push(copy);
    }
    value.forEach((child, i) => {
      shrink(child).forEach((smaller) => {
        const copy = value.slice();
        copy[i] = smaller;
        out.push(copy);
      });
    });
    return out;
  }
  if (isPlainObject(value)) {
    const out = [];
    Object.keys(value).forEach((key) => {
      shrink(value[key]).forEach((smaller) => out.push({ ...value, [key]: smaller }));
    });
    return out;
  }
  return [];
}

export class Suite {
  constructor(name) {
    this.name = name;
    this.results = [];
    this.queue = [];
  }

  // Deterministic example test. May be async; `await suite.settle()` runs it.
  test(name, fn) {
    this.queue.push(async () => {
      try {
        await fn();
        this.results.push({ name, ok: true });
      } catch (err) {
        this.results.push({ name, ok: false, error: err.message });
      }
    });
    return this;
  }

  // Property: `generate(rng)` builds a case, `property(value)` must never throw.
  property(name, generate, property, options = {}) {
    const runs = options.runs || 40;
    const seed = options.seed || 1;
    this.queue.push(async () => {
      const rng = mulberry32(seed);
      for (let i = 0; i < runs; i++) {
        const value = generate(rng, i);
        try {
          await property(value);
        } catch (err) {
          const minimal = await minimize(value, property);
          this.results.push({ name, ok: false, error: err.message, counterexample: minimal });
          return;
        }
      }
      this.results.push({ name, ok: true, runs });
    });
    return this;
  }

  // Run every queued test/property in declaration order.
  async settle() {
    const queue = this.queue;
    this.queue = [];
    for (const run of queue) await run();
    return this;
  }

  get failed() {
    return this.results.filter((r) => !r.ok);
  }

  report() {
    const lines = [];
    for (const r of this.results) {
      lines.push(`${r.ok ? "ok  " : "FAIL"} ${this.name} > ${r.name}${r.runs ? ` (${r.runs} runs)` : ""}`);
      if (!r.ok) {
        lines.push(`     ${r.error}`);
        if (r.counterexample !== undefined) {
          lines.push(`     counter-example: ${JSON.stringify(r.counterexample)}`);
        }
      }
    }
    return lines.join("\n");
  }
}

// Try to find the smallest failing value (greedy shrinking).
async function minimize(value, property) {
  let current = value;
  let improved = true;
  while (improved) {
    improved = false;
    for (const candidate of shrink(current)) {
      try {
        await property(candidate);
      } catch {
        current = candidate;
        improved = true;
        break;
      }
    }
  }
  return current;
}
