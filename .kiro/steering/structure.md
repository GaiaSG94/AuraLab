---
inclusion: always
---

# Steering — Project Structure

## Layout

```text
.kiro/                 specs (EARS), steering, hooks, agents, skills, workflows, settings
core/                  the shell: no science at all
  validate.js            single source of truth for the schema (browser + Node)
  catalog.js             built-in instruments/surfaces + pack merge
  shell.js               2D lab page: header, steps | bench | panel, loop
  headless.js            boot without a DOM (3D labs, tests, MCP server)
  controls.js            sliders bound to live config paths
  instruments.js         chips (readouts) and curves (history)
  notebook.js            notes + snapshots + restore + persistence
  ghost.js               the flask mascot (logo + notebook guide)
  time.js  strings.js  styles.css
engines/<pack>/        interchangeable simulation packs
  index.js               pack manifest: laws, apparatus kinds, measures
  world.js               state, scheduling, measures, rendering
  laws/<law>.js          one composable law per file, with its notice
app-<name>/            one lab = one folder
  config.json            everything the lab says (data, not code)
  lab.js                 wiring: config -> world -> interface
  index.html             explicit wiring of the page
  game.js                optional: custom full-screen UI (3D labs)
tests/                 property-based tests (zero dependency)
scripts/               validator, standalone builder, guided scaffolder
mcp-server/            local MCP server for Kiro agents (stdio, zero dependency)
dist/                  generated standalone labs (committed, checked by CI)
```

## Naming conventions

- Kebab-case for ids and folders: `app-ponts`, `placement-circulaire.js`.
- camelCase for JS identifiers; PascalCase only for classes (there are none).
- Lab ids in configs are short and stable (`space`, `eco`, `chimie`, `ponts`).
- Law ids match their file name exactly (`gravitation.js` -> `gravitation`).
- Catalog ids are the vocabulary of the kit: `laws`, `apparatus`,
  `instruments`, `metrics`, `substances`, `material`, `bench`, `notebook`.

## Import patterns

- The core never imports from `app-*` or `engines/*`. The dependency arrow
  points one way: `app-*` -> `core/` and `app-*` -> `engines/*`.
- A lab imports exactly one pack (`engines/<pack>/index.js`) and passes it
  to the shell as a manifest.
- Laws never touch the DOM (REQ-15): they receive `world`, `dt`, `params`,
  `targets` and mutate the world. That is what makes them testable in Node.
- `core/validate.js` is imported by the browser, by the Node validator, by
  the tests and by the MCP server. Never duplicate a range check elsewhere.

## Where to put what

| Change | Goes to |
|---|---|
| A new phenomenon | `engines/<pack>/laws/<law>.js` + one line in the pack index |
| A new kind of lab | `app-<name>/` (config + wiring + page) |
| A new instrument | `core/catalog.js` (built-in) or a pack manifest |
| A new tunable | the config schema in `core/validate.js` + the docs |
| A new visual rule | `core/styles.css`, not a per-lab override |
| A new Kiro rule | `.kiro/steering/` (context) or `.kiro/specs/` (a feature) |

## Build and check commands

```powershell
node scripts/validate-config.mjs   # validate every app-*/config.json
node scripts/build-standalone.mjs  # rebuild dist/*.html
node tests/run-tests.mjs           # property-based tests
python3 .github/hermes/ci_fmt.py   # formatting gate
```

## Git conventions

- One concern per commit, message in the imperative, French or English.
- `dist/` is committed: the standalone files are the deliverable students
  receive, and CI fails if they drift from the sources.
- Generated files are regenerated, never hand-edited.
