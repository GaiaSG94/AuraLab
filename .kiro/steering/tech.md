---
inclusion: always
---

# Steering — Technology Stack

## Runtime

- **Vanilla JavaScript, ES modules.** No framework, no bundler, no
  transpiler, no package manager. `package.json` does not exist on purpose:
  adding one would start a dependency culture the track explicitly rejects.
- **HTML + CSS + Canvas 2D** for the shell labs, **three.js** for the two 3D
  labs (`app-ponts/vendor/three.min.js`, vendored, never installed).
- **Zero runtime dependency.** No API keys, no credits, no backend, no
  telemetry. Labs run offline from `file://` or any static server.
- **Node.js is a build-time tool only**, used for the validator, the
  standalone builder and the test suite. It is never required by a student.

## Toolchain

| Tool | Version | Role |
|---|---|---|
| Node.js | 20+ (CI uses 24) | scripts, tests, MCP server |
| Python | 3.9+ (stdlib only) | CI gates (format, integrity, budget) |
| GitHub Actions | ubuntu-latest | CI (5 jobs, each ≤ 5 min) |

Python scripts use the **standard library only** — no pip install, no
requirements file. The CI must run on a bare runner.

## Test stack

- **Property-based testing**, hand-rolled and dependency-free:
  `tests/harness.mjs` (seeded RNG + greedy shrinking) and one property file
  per area. Properties are written as implications ("IF the premise holds,
  THEN ...") so that shrinking never turns a property falsely red.
- Every property names the EARS requirement it checks, so a spec change and
  a test change are the same review.
- The labs are simulated **headlessly** (`tests/labs.mjs`): no DOM, no
  browser, 600 frames per lab, checking every measure stays finite.

## Constraints that are not negotiable

- **Lean**: zero dependency, no mandatory build step, small readable files.
- **Kiro at build time only**: the labs run without Kiro, credits or keys.
- **No crash, ever**: bad numbers get clamped with a warning; only structural
  violations are errors.
- **CI ≤ 5 minutes per job**, enforced by `.github/ci-budget/check_timeouts.py`.
- **Files < 500 lines, functions < 50 lines** (repo-wide rule).
- **Comments explain *why*, never *what*.** No commented-out code, no
  commented-out blocks, no "temporary" hacks.

## What not to introduce

npm packages, bundlers, TypeScript, CSS frameworks, server-side code,
databases, analytics, accounts, and any runtime AI call.
