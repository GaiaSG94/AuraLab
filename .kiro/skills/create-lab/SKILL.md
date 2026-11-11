---
name: create-lab
description: Create a new LabKit lab from scratch - copy a folder, write the config, wire the page, validate, and build the standalone file. Use when the user asks for a new lab, a new experiment, or a new laboratory for the kit.
license: MIT
compatibility: Node.js 20+ for the validator and the builder; a browser to view the result.
---

# Create a LabKit lab

A lab is a **folder** plus a **config**. The core is never edited.

## 1. Pick the model to copy

| The lab is about | Copy | Engine |
|---|---|---|
| populations, motion, orbits (2D) | `app-space/` or `app-eco/` | `particles` |
| glassware, mixing, heat (3D) | `app-chimie/` | `chimie` |
| structures, load, breakage (3D) | `app-ponts/` | `ponts` |

```powershell
Copy-Item -Recurse app-eco app-mon-labo
```

## 2. Write the config (`app-mon-labo/config.json`)

Strict JSON, no comments. The full schema is documented in
`CREER-UN-LABO.md` (for teachers) and in `.kiro/steering/creer-un-labo.md`
(for agents). Minimum viable config:

```json
{
  "lab": { "id": "mon-labo", "title": "My Lab", "accent": "#ffb454", "page": "#5b8cff" },
  "bench": { "background": "#07090c", "trail": 0.25, "speckles": 0 },
  "bounds": "wrap",
  "substances": [
    { "id": "population", "label": "Population", "count": 80, "color": "#9ad1ff", "radius": 3, "mass": 1, "speed": 40 }
  ],
  "material": [],
  "laws": [{ "law": "errance" }],
  "metrics": [
    { "id": "population", "label": "Population", "unit": "individus", "source": "counts.population" }
  ],
  "instruments": [{ "type": "chips", "metrics": ["population"] }],
  "controls": [
    { "path": "substances.population.count", "label": "Population", "min": 0, "max": 300, "step": 10 }
  ],
  "notebook": { "enabled": true, "prompts": ["What happens when the population doubles?"] }
}
```

Rules that save time:
- `source` of a metric is `counts.<substance-id>` or a measure exposed by the
  engine (`consumed`, `temp`, `score`...).
- a slider `path` is `substances.<id>.count`, `material.<id>.strength`,
  `laws.<n>.<param>` or `bench.trail`;
- the particle total stays under 1500.

## 3. Wire the page

For a 2D lab, copy `app-space/lab.js` and change the engine import. The
folder `index.html` stays as it is (it already imports `core/shell.js`).

## 4. Validate

```powershell
node scripts/validate-config.mjs
```

Errors name the offending value. Warnings mean a number was auto-tuned —
check that the tuned value is acceptable for your lab.

## 5. Look at it

```powershell
./start-lab.bat
```

Open <http://localhost:8080/app-mon-labo/>.

## 6. Prove it stays stable

```powershell
node tests/run-tests.mjs
```

If your lab introduces a new guarantee, add the matching property to
`tests/properties-labs.mjs`, named after its requirement.

## 7. Ship it

```powershell
node scripts/build-standalone.mjs
```

Commit `dist/labkit-mon-labo.html` — that is the file students receive.
Then add the lab to the portal `index.html` and to the standalone builder
list in `scripts/build-standalone.mjs`.
