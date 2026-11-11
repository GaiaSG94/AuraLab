---
name: add-law
description: Add a new law to a LabKit engine - write the module, give it a notice, register it in the pack, expose it to a lab and prove it with a property test. Use when the user asks for a new physical rule, behaviour or interaction.
license: MIT
compatibility: Node.js 20+ to validate and test.
---

# Add a law to LabKit

A law is one file, one rule, one notice. It is the unit of simulation in
this kit.

## 1. Check the catalog first

The MCP tool `list_catalog` lists every law with its notice. If one already
covers the rule, use it: fewer laws is a better kit. The guided script
`scripts/add-element.mjs` (or `add-element.bat`) asks the questions and
generates the skeleton.

## 2. Write the module

`engines/<pack>/laws/<id>.js`:

```js
// Law: <id> — one sentence on what it does.
export const maLoi = {
  id: "<id>",
  notice: {
    label: "<display label>",
    formule: "The rule, with the symbols.",
    sources: "Established science (with the reference) or 'ad-hoc rule written for this lab'.",
    limites: "What this law does NOT model.",
  },
  defaults: { k: 1 },
  apply(world, dt, params, targets, active) {
    for (const p of world.particles) {
      if (!targets.includes(p.e)) continue;
      // mutate p.ax / p.ay, or world.steer(p, dx, dy, rate, dt)
    }
  },
};
```

Non-negotiable:

- **no DOM** (`document`, `window`, `localStorage`) — the law must run in
  Node, that is how it is tested (REQ-15);
- **deterministic** — use `world.rng`, never `Math.random()`;
- **bounded** — no NaN, no infinity, even with every slider at its extreme
  (REQ-14, REQ-26);
- **one step** — read the state, write the state.

## 3. Register it

`engines/<pack>/index.js`: one import line, one entry in the map. Without
it the law is invisible to the validator and to the labs.

## 4. Expose it

Add it to a lab config:

```json
{ "law": "<id>", "targets": ["population"], "params": { "k": 2 } }
```

- `targets` restricts the law to some substances; omit it and it applies to
  all of them;
- `params` are the values of the `defaults`, overridden per lab.

## 5. Prove it

Add a property to `tests/properties-simulation.mjs`, named after the
requirement it serves. The interesting properties are:

- a law switched off has **no effect** (REQ-11);
- a law switched on runs **every step** (REQ-10);
- the world stays **finite** under extreme parameters (REQ-26);
- the speed cap holds (REQ-14).

## 6. Verify

```powershell
node scripts/validate-config.mjs
node tests/run-tests.mjs
node scripts/build-standalone.mjs
```

## 7. Document it

The notice is the documentation: rule, sources, limits. If the law models
something real, name the source; if it is invented, say so. A student must
be able to tell which laws are science and which are toys.
