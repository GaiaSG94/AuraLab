# visual-lab — Requirements (EARS)

Lean, reusable template for visual education labs (Kiroween Skeleton Crew track).
One generic shell renders every lab; each lab is a config + small wiring code.

## Catalog and config

- REQ-01: WHEN the app boots THEN the system SHALL load exactly one lab config
  (file over HTTP, or object in standalone builds) and validate it before display.
- REQ-02: WHEN the config is missing, invalid JSON, or structurally wrong THEN
  the system SHALL render a readable error panel instead of a blank page.
- REQ-03: WHEN a numeric config value is non-finite or out of range THEN the
  system SHALL clamp or reset it to a safe default and record a warning.
- REQ-04: WHEN the config references an unknown law, apparatus, instrument or
  metric source THEN the system SHALL refuse it and name the unknown reference.
- REQ-05: WHEN the total particle count exceeds 1500 THEN the system SHALL
  refuse the config.
- REQ-06: The catalog SHALL be the single list of orderable elements, organized
  by category (laws, apparatus, instruments, metrics, bench, notebook options).

## Laws and simulation

- REQ-10: WHEN a lab lists laws THEN the system SHALL apply each active law
  every step, in list order, to its targets (or all substances when untargeted).
- REQ-11: WHEN a law is unchecked THEN the system SHALL skip it without
  restarting or rebuilding the lab.
- REQ-12: WHEN a substance is unchecked THEN the system SHALL freeze and hide
  its particles (and exclude them from neighbor searches).
- REQ-13: WHEN material is unchecked THEN the system SHALL ignore it
  (e.g. disabled attractor exerts no force).
- REQ-14: Particle speed SHALL be capped at 900 px/s to stay stable under
  extreme sliders.
- REQ-15: Law modules SHALL NOT access the DOM, so they run identically in
  browsers and in Node.

## Presentation and instruments

- REQ-20: WHEN the lab defines an accent color THEN the system SHALL apply it
  to markers, sliders, readouts and live values.
- REQ-21: WHEN elements exist THEN the system SHALL render one selectable row
  per substance, material and law, grouped by category, each with a checkbox
  and an expandable notice (rule, sources, limits).
- REQ-22: WHEN metrics are declared THEN each instrument SHALL display exactly
  the metrics it lists, with units.
- REQ-23: WHEN controls are declared THEN the system SHALL render one slider
  per control bound live to its config path (substances, material, law params,
  bench).
- REQ-24: WHEN a count changes THEN the system SHALL add or remove particles
  to match without restarting.
- REQ-25: WHEN the notebook is enabled THEN the user SHALL record timestamped
  notes and instant snapshots (time + metric values + tunable params), restore
  snapshots, and persist across reloads.
- REQ-26: WHEN the user prefers reduced motion THEN the system SHALL start
  paused; time controls (play, reset, single-step) SHALL always be available.

## Template versatility (track proof)

- REQ-30: The core (`core/`) SHALL contain zero lab-specific science; all
  differences between labs SHALL live in their configs, wiring and laws used.
- REQ-31: The repo SHALL ship two runnable labs (`app-space/`, `app-eco/`)
  built from the unchanged core.
- REQ-32: A new lab SHALL require only a new folder (`index.html`, `lab.js`,
  `config.json`); no core edit SHALL be needed.
- REQ-33: A new law SHALL require only a new module file plus one registration
  line; the `add-element` prompt SHALL scaffold it.
