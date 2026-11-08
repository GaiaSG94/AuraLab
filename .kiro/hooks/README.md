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

## Installed hook

`validate-lab-config.json` (schema `v1`, trigger `PostFileSave`, matcher
`app-*/config.json`) runs `node scripts/validate-config.mjs` and fails the
save result on exit code ≠ 0. It activates automatically — no panel setup.
Note: file triggers fire on agent-made saves, not manual editor saves; to
see it fire, have the agent edit a config.
