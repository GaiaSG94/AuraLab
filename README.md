# LabKit — one kit, many labs

A lean, zero-dependency template for **virtual education labs**. One shared
core, one catalog of composable laws, and labs that differ only by their data.

Built for the Kiroween **Skeleton Crew** track: a template lean enough to be
read, flexible enough to carry very different subjects — proven here by four
labs, two rendering modes and three engines.

```text
core/                  the shell: layout, theme, sliders, instruments, notebook,
                       validation — knows zero science
engines/particles/     2D engine: world + 8 composable laws
engines/chimie/        3D engine: glassware, mixing, heating
engines/ponts/         3D engine: nodes, sticks, load, breakage
app-space/             Space Lab  — gravity well, planets, asteroid belt (2D)
app-eco/               Eco Lab    — rabbits, foxes, bushes, population chart (2D)
app-chimie/            Chemistry Lab — real aqueous chemistry: titration, pH, precipitates, CO2
app-ponts/             Bridge Lab — ten structural materials, generated levels, load ladder, purse
scripts/               validator, standalone builder, scaffolder, CI guards
tests/                 property-based tests (zero dependency)
mcp-server/            local MCP server for Kiro agents (stdio)
power-labkit/          installable Kiro power (manifest + MCP + skills)
.kiro/                 specs, steering, hooks, agents, skills, workflows, settings
dist/                  standalone labs: one double-clickable file per lab
```

## Run it

Easiest: double-click a file in **`dist/`** — fully standalone, no server,
no network:

- `dist/labkit-chimie.html` — Chemistry Lab (3D): 8 reagents, burette titration, pH / precipitate / pressure
- `dist/labkit-ponts.html` — Bridge Lab (3D): levels that widen the gap and the load ladder, a purse that carries over
- `dist/labkit-space.html` — Space Lab (2D)
- `dist/labkit-eco.html` — Eco Lab (2D)

Regenerate them after editing `core/`, `engines/` or a config:

```powershell
node scripts/build-standalone.mjs
```

Or serve the modular sources with any static server (ES modules + `fetch`
need HTTP, not `file://`) — double-click **`start-lab.bat`**, or:

```powershell
python -m http.server 8080
```

Then open `index.html` for the portal, or `app-space/`, `app-eco/`,
`app-chimie/`, `app-ponts/` directly.

## Create a new lab

1. Copy an existing lab folder: `app-eco/` for 2D, `app-chimie/` for 3D.
2. Edit `config.json` (schema below) and the `<title>` in `index.html`.
3. Validate, then reload. No core change, ever.

```powershell
node scripts/validate-config.mjs
node scripts/build-standalone.mjs
```

Non-developers: read **`CREER-UN-LABO.md`** (French, step by step, no code).

## Config schema

| Key | Meaning |
|---|---|
| `lab.id`, `lab.title`, `lab.subtitle`, `lab.note` | identity and header text |
| `lab.page` | flat page color (ink text sits on it, keep it mid-light) |
| `lab.accent` | legacy accent color (still required) |
| `lab.lang` | `en` or `fr` (UI strings) |
| `lab.home` | target of "← all labs" (default `../index.html`) |
| `bench.background`, `bench.trail`, `bench.speckles` | scene backdrop |
| `bounds` | `wrap` or `bounce` at the edges |
| `substances[]` | populations: `id`, `label`, `count`, `color`, `radius`, `mass`, `speed`, `ring?`, `links?` |
| `material[]` | apparatus: `id`, `kind` (from the catalog), `label`, `x`, `y`, plus the kind's settings |
| `laws[]` | active rules, in order: `{ law, targets?, params? }` |
| `metrics[]` | measured quantities: `id`, `label`, `unit`, `source`, `color` |
| `instruments[]` | `chips` (live readouts) and/or `curve` (history) |
| `controls[]` | sliders: `path`, `label`, `min`, `max`, `step` |
| `notebook` | `enabled`, `prompts[]` (suggested questions) |

Valid slider paths: `substances.<id>.count`, `material.<id>.strength`,
`laws.<n>.<param>`, `bench.trail`. Bad numbers are auto-tuned with a warning;
structural errors fail loudly and **name the offending value**.

### Bridge Lab levels

`app-ponts/config.json` has no `sites` list. The level generator
(`engines/ponts/levels.js`) derives every level from a `levels` block, and a
level is a complete site: gap width, load ladder, material palette, purse and
reward. The valley, river and bridge are rebuilt around it.

```json
"levels": {
  "width":   { "start": 12, "step": 4, "max": 44 },
  "rungs":   { "start": 2, "step": 1, "max": 6, "every": 2 },
  "weight":  { "start": 8, "step": 5, "max": 45 },
  "purse":   { "start": 90, "step": 45, "max": 900 },
  "reward":  { "perTon": 12, "min": 40 },
  "unlocks": { "start": 3, "every": 1 }
}
```

Clearing the ladder banks `purse - spent + reward`, unlocks the next level and
keeps the finished bridge on screen until **Next level** (or `N`) is pressed.
The level, the purse and every saved design live in `localStorage`
(`labkit.ponts.save.v2`), so a reload resumes the run.

## Kiro integration

The kit is built with Kiro at **build time only**. Every lab runs offline,
without credits, keys or a backend. Each surface below is verifiable from
the repository:

| Surface | Where | Proof it works |
|---|---|---|
| **Specs** (EARS) | `.kiro/specs/visual-lab/`, `.kiro/specs/kiro-integration/` | requirements, design and tasks, kept in sync with the code |
| **Steering** | `.kiro/steering/` | `product`, `tech`, `structure` (foundation) + architecture, design system, law authoring; each file declares its inclusion mode |
| **Hooks** | `.kiro/hooks/` | 6 triggers, all deterministic commands; the PreToolUse guard blocks a dirty `git push` |
| **MCP** | `.kiro/settings/mcp.json` + `mcp-server/` | server `labkit`, 5 tools; `node mcp-server/smoke-test.mjs` |
| **Custom agents** | `.kiro/agents/` | `lab-architect`, `law-smith`, `config-doctor`, `lab-reviewer` |
| **Skills** | `.kiro/skills/` | `create-lab`, `add-law`, `package-standalone` |
| **Workflows** | `.kiro/workflows/` | `new-lab`, `fix-until-green`, `audit-labs`; `node scripts/validate-workflows.mjs` |
| **Power** | `power-labkit/` | Agent Plugins manifest + MCP + 2 skills, installable from GitHub |
| **Correctness** | `tests/` | property-based tests, one per REQ; `node tests/run-tests.mjs` |
| **Permissions** | `.kiro/settings/permissions.example.yaml` | workspace permissions are per-user; the installer script writes them |
| **.kiroignore** | `.kiroignore` | keeps `dist/` and the vendored three.js out of the agent context |
| **AGENTS.md** | `AGENTS.md` | the contract every agent surface reads |

### The hook that actually bites

`guard-ship.json` is a **PreToolUse** hook. Before any `git commit`, `push`,
`merge` or `rebase`, it runs the validator, the property tests and the
standalone build; if any of them fails, or if `dist/` drifted, it exits 2 and
the tool call is blocked. The same gate runs in CI, so nothing can be shipped
that would not pass.

### Permissions

Kiro stores workspace permissions **per user, outside the repository** — a
cloned repo cannot inject its own rules. The repo therefore ships a model and
an installer:

```powershell
node scripts/install-kiro-permissions.mjs
```

It finds the Kiro workspace entry for this folder and writes the rules from
`.kiro/settings/permissions.example.yaml`. Open the folder in Kiro once first
(so it records the workspace and asks about trust).

## Commands

```powershell
node scripts/validate-config.mjs     # validate every app-*/config.json
node scripts/build-standalone.mjs    # rebuild dist/*.html
node tests/run-tests.mjs             # property-based tests
node scripts/validate-workflows.mjs  # validate the workflow recipes
node scripts/check-kiro.mjs          # validate every Kiro artifact
node mcp-server/smoke-test.mjs       # drive the MCP server end to end
python3 .github/hermes/ci_fmt.py     # formatting gate
```

## Design

Flat page, one color per lab, ink text, Archivo condensed for titles and
JetBrains Mono for numbers. The flask ghost is the logo and the notebook
guide. The two 3D labs are documented exceptions: full-screen scenes with a
frosted-glass HUD, because the 3D content shows through. See
`.kiro/steering/design-system.md`.

## License

MIT.
