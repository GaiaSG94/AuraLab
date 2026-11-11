# kiro-integration — Requirements (EARS)

Every Kiro technology the track judges must be present, wired and **verifiable
from the repository** — a judge opens the repo, sees the artifact, and can run
a check that proves it is not decorative.

## Coverage

- REQ-01: The repo SHALL declare a steering layer with the three foundation
  files (`product.md`, `tech.md`, `structure.md`) plus the project-specific
  rules (architecture, design system).
- REQ-02: Every steering file SHALL declare an inclusion mode (always,
  fileMatch, auto, manual) appropriate to its scope.
- REQ-03: The repo SHALL ship hooks covering every trigger the workflow needs:
  file save, file creation, spec task completion, session start, turn stop and
  a PreToolUse gate.
- REQ-04: WHEN a hook guards an operation THEN it SHALL run a deterministic
  command (never an LLM prompt) and SHALL exit 2 to block it.
- REQ-05: The workspace MCP config SHALL declare a server named `labkit`
  exposing at least `list_catalog`, `list_labs`, `validate_lab`,
  `headless_check` and `scaffold_law`.
- REQ-06: The MCP tools SHALL be read-only by default and auto-approved; the
  only writing tool SHALL require confirmation.
- REQ-07: The repo SHALL ship custom agents (`.kiro/agents/`) covering
  designing, implementing, diagnosing and reviewing a lab, each with an
  explicit tool set and capability-based permissions.
- REQ-08: Every custom agent SHALL load the steering files and the skills it
  needs through its `resources` field (agents do not inherit steering).
- REQ-09: The repo SHALL ship agent skills (`.kiro/skills/`) for the three
  recurring workflows: creating a lab, adding a law, packaging the standalone.
- REQ-10: The repo SHALL ship workflow recipes (`.kiro/workflows/`) covering a
  multi-step sequence, a parallel review and a bounded repeat loop.
- REQ-11: Every workflow recipe SHALL pass a local validator that checks the
  documented schema, unique ids, step/depth caps and template references.
- REQ-12: The repo SHALL ship a Kiro power (`plugin.json` format) that
  packages the catalog knowledge and the MCP server.
- REQ-13: The repo SHALL ship a `.kiroignore` that keeps generated and
  vendored files out of the agent context.
- REQ-14: The repo SHALL ship an `AGENTS.md` stating the non-negotiable rules,
  so any agent surface (not just Kiro) reads the same contract.
- REQ-15: WHEN a Kiro artifact (hook, agent, skill, workflow, power) ships
  THEN a check SHALL prove it loads or parses, and CI SHALL run that check.

## Correctness (property-based testing)

- REQ-20: WHEN a requirement states an invariant THEN the repo SHALL express
  it as a property written as an implication ("IF the premise holds, THEN
  ..."), so shrinking never produces a false counter-example.
- REQ-21: The property harness SHALL be deterministic (seeded RNG) and
  dependency-free.
- REQ-22: WHEN a property fails THEN the harness SHALL report the shrunk
  counter-example, not the generated one.
- REQ-23: WHEN a property reveals a real defect THEN the fix SHALL go into
  the product code, never into the test's expectations.
