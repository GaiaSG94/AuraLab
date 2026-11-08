# AuraLab — Visual Lab Template

A lean, zero-dependency template for visual education labs.
Built for the Kiroween **Skeleton Crew** track: one shared core, two
distinct labs proving its versatility.

```text
.kiro/          specs (EARS), steering docs, hook wiring
core/           shared engine: validate.js, sim.js, app.js, styles.css
app-space/      lab 1: gravity well, planets, asteroid belt, comets
app-eco/        lab 2: rabbits vs foxes, bushes, population chart
scripts/        validate-config.mjs (also used by the Kiro save hook)
```

## Run it

Easiest: double-click **`dist/aura-space.html`** or **`dist/aura-eco.html`** —
fully standalone, no server needed. (Regenerate with
`node scripts/build-standalone.mjs` after editing `core/` or configs.)

Alternative: serve the modular sources with any static server (ES modules +
`fetch` need HTTP, not `file://`) — double-click **`start-lab.bat`** and
leave its window open, or:

```powershell
cd AuraLab
python -m http.server 8080
```

Then open in a browser:

- <http://localhost:8080/app-space/> — astronomy lab
- <http://localhost:8080/app-eco/> — ecosystem lab

## Validate configs

```powershell
node scripts/validate-config.mjs
```

Bad numbers are auto-tuned with a warning; structural errors fail loudly.
Wire it as a Kiro post-save Agent Hook — see `.kiro/hooks/README.md`.

## Create a new lab

1. Copy `app-space/` to `app-<name>/`.
2. Edit `config.json` (schema below) and the `<title>` in `index.html`.
3. Run the validator, reload the page. No core change needed.

## Config schema

| Key | Meaning |
|---|---|
| `lab.title`, `lab.subtitle`, `lab.note` | header text |
| `lab.accent` | hex color theming the whole dashboard |
| `canvas.background`, `canvas.trail` | backdrop + motion-trail strength (0.05–1) |
| `canvas.starfield` | static background dots (0–600) |
| `bounds` | `wrap` or `bounce` at edges |
| `wells[]` | gravity points: `x`,`y` (0–1), `strength` (0–5000), `radius`, `color` |
| `emitters[]` | particle groups (max 6, 1500 particles total) |
| `hud.history`, `hud.historyLabel`, `hud.samples` | population chart |
| `controls[]` | sliders: `path` (e.g. `wells.0.strength`), `label`, `min`, `max`, `step` |

Emitter fields: `id`, `label`, `count`, `color`, `radius`, `mass`, `speed`,
`behavior` (`orbit` | `drift` | `wander` | `seek` | `flee`), plus:

- `orbit`: `orbitBand` ([min, max] fraction of canvas size around well 0).
- `seek` / `flee`: `target` (another emitter id).
- predation: `predates` (prey emitter id, eaten on contact).
- regrowth: `respawn: true` (refill up to `count`, max 3/step).
- network: `links: { distance }` (lines between same-emitter particles).

## Kiro usage

- `.kiro/specs/visual-lab/` — requirements (EARS), design, tasks.
- `.kiro/steering/` — architecture and design-system rules for agents.
- `.kiro/hooks/` — save-hook wiring for config validation.

Kiro is used at build time only. Labs run offline from any static server —
no runtime API keys, no credits, no backend.
