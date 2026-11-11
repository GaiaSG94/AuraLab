# kiro-integration — Tasks

Each task ends with an observable check. Checks marked `[x]` are verified by
`node scripts/check-kiro.mjs`, `node scripts/validate-workflows.mjs`,
`node tests/run-tests.mjs` or `node mcp-server/smoke-test.mjs` in CI.

- [x] 1. Steering: foundation files + inclusion modes + project rules
  - Check: `product.md`, `tech.md`, `structure.md` exist; every steering file
    declares a valid inclusion mode.
- [x] 2. Hooks: six triggers wired to deterministic commands
  - Check: `check-kiro.mjs` finds a hook for PostFileSave, FileCreate,
    PreToolUse, SessionStart, Stop and PostTaskExecution; every action is
    `command` (never `agent`), so no hook costs credits.
- [x] 3. PreToolUse guard that actually blocks a dirty push
  - Check: with an invalid config, `echo '{"tool_input":{"command":"git push"}}'
    | node scripts/kiro-hook.mjs guard-commit` exits 2.
- [x] 4. MCP server: renamed, modular, five tools, read-only tools auto-approved
  - Check: `node mcp-server/smoke-test.mjs` drives all five and reports the
    four labs validating.
- [x] 5. Custom agents: four roles, narrow tools, capability permissions,
  explicit steering resources
  - Check: each agent has a name, description, tools, permissions, resources
  and a non-empty prompt.
- [x] 6. Agent skills: the three recurring workflows
  - Check: each skill has front matter whose `name` matches its folder and a
    non-empty description.
- [x] 7. Workflow recipes: sequence, parallel review, bounded repeat
  - Check: `node scripts/validate-workflows.mjs` reports 0 errors, 0 warnings.
- [x] 8. Kiro power: Agent Plugins manifest + MCP + skills
  - Check: `plugin.json` has $schema, name, version, description, author.name
    and non-empty keywords.
- [x] 9. `.kiroignore` and `AGENTS.md`
  - Check: both exist at the repo root.
- [x] 10. Property-based test harness (deterministic, dependency-free,
  shrinking) + properties for every invariant requirement
  - Check: `node tests/run-tests.mjs` reports 21/21; a seeded run reproduces
    the same result.
- [x] 11. CI jobs for the new checks, inside the 5-minute budget
  - Check: `ci-budget` passes; the `test` job runs fmt, integrity, Kiro
    artifacts, workflows, properties and the MCP probe.
- [x] 12. Docs synced with the artifacts (README, INTENT, mcp-server, hooks)
  - Check: a reader of the README can name every Kiro surface and the command
    that proves it.
- [ ] 13. Record a short screen capture of a hook blocking a bad commit and an
  agent using the MCP catalog (for the demo video)
  - Check: the clip is under 3 minutes and shows a real refusal.
