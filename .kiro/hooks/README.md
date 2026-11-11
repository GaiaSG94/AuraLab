# Agent Hooks — wiring

Hooks are JSON files in `.kiro/hooks/`. They activate automatically when a
session starts; no panel setup is needed. Every hook in this repo runs a
**deterministic command** (never an agent prompt), so none of them costs
credits and all of them are testable from a terminal.

The commands all go through one script: `scripts/kiro-hook.mjs <mode>`.

## What is wired

| File | Trigger | Matcher | What it does |
|---|---|---|---|
| `validate-lab-config.json` | PostFileSave | `app-*/config.json` | validates every lab config |
| `validate-lab-config.json` | PostFileSave | `*.js` | `node --check` on the saved file |
| `lab-scaffold.json` | FileCreate | `app-*/index.html` | refuses a new lab with no `config.json` |
| `law-authoring.json` | PostFileSave | `engines/*/laws/*.js` | refuses a law that is not registered in its pack |
| `law-authoring.json` | PostFileSave | `engines/*/laws/*.js` | refuses a law that touches the DOM (REQ-15) |
| `guard-ship.json` | PreToolUse | `execute_bash` / `execute_pwsh` | **blocks** `git commit/push/merge/rebase` while the repo is not shippable |
| `lifecycle.json` | SessionStart | — | injects the repo facts into the agent context |
| `lifecycle.json` | PostTaskExecution | — | re-runs every gate after a spec task |
| `lifecycle.json` | Stop | — | asks the agent to finish the job before the turn ends |

## The guard that bites

`guard-ship.json` is the one that changes behaviour. Before any ship command
it runs, in order:

1. `node scripts/validate-config.mjs` — every config must validate;
2. `node tests/run-tests.mjs` — every property must hold;
3. `node scripts/build-standalone.mjs` then `git status --porcelain dist/` —
   the standalone files must match the sources.

Any failure exits **2**, which blocks the tool call and returns the reason to
the agent. The same three gates run in CI, so a change that cannot be
committed locally cannot be merged either.

Note the side effect: step 3 **rebuilds `dist/`** before comparing it with
git, exactly like the CI `build` job does. If the sources changed and `dist/`
was not rebuilt, the hook rebuilds it and then blocks, telling the agent to
commit the result. The guard therefore takes a few seconds per ship command.

The `Stop` hook reports the same failures once per session (it writes a
marker in the temp dir), so it cannot loop forever.

## Trying a hook by hand

File triggers only fire on **agent-made** changes, not on manual editor
saves. To see one fire, have the agent edit a file. To test the logic
directly, feed it the event JSON on stdin:

```powershell
'{"tool_input":{"command":"git push"}}' | node scripts/kiro-hook.mjs guard-commit
'{"file_path":"engines/particles/laws/gravitation.js"}' | node scripts/kiro-hook.mjs check-law-dom
node scripts/kiro-hook.mjs session-context
```

Exit codes: `0` fine, `1` error reported, `2` block the tool call.

## Adding a hook

Copy one of the files, give it a descriptive kebab-case name, and keep the
action a `command`. Matchers are regexes against the file path (file
triggers) or tool selectors / regexes against the tool id (tool triggers).
`node scripts/check-kiro.mjs` verifies the schema and that every trigger the
workflow needs is covered.
