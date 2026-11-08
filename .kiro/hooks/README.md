# Agent Hooks — wiring

One hook is all this template needs: validate lab configs on save so a bad
edit never reaches the demo.

## Recommended hook (Kiro panel → Agent Hooks → New)

- Name: `validate-lab-config`
- Event: post-save (file write)
- File pattern: `app-*/config.json`
- Command: `node scripts/validate-config.mjs`
- Behavior: block the save result / show output when exit code ≠ 0.

## What the script does

`scripts/validate-config.mjs` imports the same `core/validate.js` the
browser uses, checks every `app-*/config.json`, prints warnings for
auto-tuned values and fails on structural errors. Zero dependencies.

## Why a doc instead of a JSON blob

Kiro hook schemas evolve; the panel is the source of truth for field names.
This file plus the runnable script is the stable contract — wire it once in
the IDE and every config edit is guarded.
