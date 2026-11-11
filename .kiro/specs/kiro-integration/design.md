# kiro-integration — Design

## Layout of the Kiro layer

```text
.kiro/
  specs/
    visual-lab/        requirements (EARS), design, tasks — the kit itself
    kiro-integration/  requirements, design, tasks — this spec
  steering/
    product.md         foundation, inclusion: always
    tech.md            foundation, inclusion: always
    structure.md       foundation, inclusion: always
    architecture.md    project rules, inclusion: always
    design-system.md   visual rules, inclusion: fileMatch (css/js/html)
    creer-un-labo.md   procedure, inclusion: manual (#creer-un-labo)
    lois-et-notices.md law authoring, inclusion: auto
  hooks/
    validate-lab-config.json  PostFileSave (config) + PostFileSave (js)
    lab-scaffold.json         FileCreate (new lab must ship a config)
    law-authoring.json        PostFileSave (law registered, law DOM-free)
    guard-ship.json           PreToolUse (block git commit/push when dirty)
    lifecycle.json            SessionStart, PostTaskExecution, Stop
  agents/
    lab-architect.md   designs, writes specs, no implementation
    law-smith.md       writes a law + notice + registration + property
    config-doctor.md   diagnoses and fixes a config
    lab-reviewer.md    reviews against specs, read-only
  skills/
    create-lab/        the seven-step procedure
    add-law/           module, notice, registration, proof
    package-standalone/ rebuild and verify dist/
  workflows/
    new-lab.workflow.json          design → implement → parallel review → fix
    fix-until-green.workflow.json  repeat loop with a fileCheck stop condition
    audit-labs.workflow.json       parallel audit of the four labs + aggregate
  settings/
    mcp.json                  workspace MCP server `labkit`
    permissions.example.yaml  model for the per-user workspace file
power-labkit/
  plugin.json    Agent Plugins manifest (keywords activate the power)
  mcp.json       the MCP server, bundled with the power
  skills/        labkit-catalog, labkit-teaching
.kiroignore      keeps dist/ and the vendored three.js out of context
AGENTS.md        the contract any agent surface reads
```

## Decisions

**Every hook runs a deterministic command.** An `agent` action costs credits
and is non-deterministic; a `command` action is free, fast and reproducible.
All hook commands go through `scripts/kiro-hook.mjs <mode>`, one mode per
guard, so the guards are testable outside Kiro.

**The PreToolUse guard is the real one.** A hook that only prints a warning
is decoration. `guard-commit` blocks `git commit`/`push`/`merge`/`rebase`
with exit code 2 while a config is invalid, a property fails or `dist/`
drifts. That is the same gate CI applies, moved earlier.

**Custom agents are narrow by design.** Each agent declares the tools and the
capability rules it needs: `lab-reviewer` has no write capability at all,
`config-doctor` may only write `app-*/config.json`. Permissions live in the
agent profile (the only permissions scope that travels with the repo); the
workspace file is per-user, outside the repo, so the repo ships a model
(`permissions.example.yaml`) plus an installer
(`scripts/install-kiro-permissions.mjs`).

**Workflows use the documented node types.** `new-lab` is a sequence with a
parallel review branch; `fix-until-green` is a bounded `repeat` whose
`stopCondition.fileCheck` reads `.kiro/workflow-output/status.json`, written
by `scripts/workflow-status.mjs`; `audit-labs` fans out one reviewer per lab
and joins with `wf-review-aggregator`. A local validator
(`scripts/validate-workflows.mjs`) checks the recipes in CI, because Kiro's
own `validate_workflow` only runs inside Kiro.

**The power is the shareable slice.** It packages the catalog and teaching
knowledge as skills, plus the MCP server, so someone installing the power
from GitHub gets the tools without cloning the repo.

**Property tests, not example tests.** A hand-written example test proves one
case; a property proves a rule across hundreds of generated cases, with
shrinking to the smallest counter-example. The harness is hand-rolled
(seeded RNG, greedy shrinking, ~120 lines) because the repo takes no
dependency. Properties are written as implications so shrinking cannot break
the premise they assert about.

## Verification

`scripts/check-kiro.mjs` walks every Kiro artifact and proves it parses and
matches the documented schema: steering front matter, hook triggers and
actions, agent fields and permission rules, skill front matter, workflow
recipes, the power manifest and the MCP config. CI runs it.

## Out of scope

Powers that need a marketplace listing, cloud configuration sync, and the
Kiro Web surfaces (which ignore hooks and permissions) are documented but not
tested here.
