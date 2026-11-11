# visual-lab — Requirements (EARS)

Lean, reusable template for visual education labs (Kiroween Skeleton Crew track).
One generic shell renders every lab; each lab is a config + small wiring code.

Four labs ship today, built on **one** core and **one** catalog: `app-space`
(2D space), `app-eco` (2D ecosystem), `app-chimie` (3D glassware), `app-ponts`
(3D bridge). The first two use the shared shell; the last two mount their own
interface but share the validator, the catalog, the notebook model and the
measurement contract.

## Catalog and config

- REQ-01: WHEN the app boots THEN the system SHALL load exactly one lab config
  (file over HTTP, or object in standalone builds) and validate it before display.
- REQ-02: WHEN the config is missing, invalid JSON, or structurally wrong THEN
  the system SHALL render a readable error panel instead of a blank page.
- REQ-03: WHEN a numeric config value is non-finite or out of range THEN the
  system SHALL clamp or reset it to a safe default and record a warning.
- REQ-04: WHEN the config references an unknown law, apparatus, instrument,
  metric source or substance THEN the system SHALL refuse it and name the
  unknown reference.
- REQ-05: WHEN the total particle count exceeds 1500 THEN the system SHALL
  refuse the config.
- REQ-06: The catalog SHALL be the single list of orderable elements, organized
  by category (laws, apparatus, instruments, metrics, bench, notebook options),
  and every entry SHALL carry a notice (rule, sources, limits).

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

- REQ-20: WHEN the lab defines a page color THEN the system SHALL use it as the
  flat page background, with the shared layout (steps | bench | panel) for every
  shell lab.
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
- REQ-31: The repo SHALL ship at least two runnable labs built from the
  unchanged core, in two distinct rendering modes (2D shell and 3D custom UI).
- REQ-32: A new lab SHALL require only a new folder (`index.html`, `lab.js`,
  `config.json`); no core edit SHALL be needed.
- REQ-33: A new law SHALL require only a new module file plus one registration
  line; the `add-element` prompt SHALL scaffold it.

## Lab depth

- REQ-50: The chemistry engine SHALL model real aqueous chemistry: molar dilution, charge-balance pH (strong and weak acids and bases), heat of neutralisation, insoluble precipitates with their mass in grams, CO2 gas evolution with the headspace pressure, and a colour indicator (bromothymol blue).
- REQ-51: The chemistry lab SHALL expose five instruments worth of measurements (temperature, pH, volume, precipitate mass, pressure) and a titration burette.
- REQ-52: The bridge engine SHALL draw members from a structural catalogue of at least six materials, each with its own cost, maximum span, stiffness, strength and self-weight, and each belonging to a mechanical family (tension only, compression only, or both).
- REQ-53: A bridge site SHALL gate its material palette, so progression is visible in the dock.
- REQ-54: The bridge dock SHALL show every allowed material with its cost and span, and the placement preview SHALL turn red when the span exceeds the material limit.
- REQ-55: The bridge lab SHALL derive each level from the `levels` block of
  its config (gap width, load ladder, heaviest ghost, material palette and
  reward) and SHALL build it as a complete site: valley, river and bridge.
- REQ-56: Difficulty SHALL never decrease from one level to the next, and
  width, rungs and weight SHALL stay inside their declared caps.
- REQ-57: WHEN a ladder is cleared THEN the purse SHALL become
  `purse - spent + reward` (never negative), the reward SHALL be banked once,
  and the next level SHALL be built from the saved level and purse.
- REQ-58: The material palette SHALL only grow with the level number, and
  SHALL eventually unlock the whole catalogue.

## Distribution and correctness

- REQ-40: WHEN the sources change THEN `dist/` SHALL be rebuildable by
  concatenation alone (no bundler), and CI SHALL fail if `dist/` drifts.
- REQ-41: WHEN a lab is simulated headlessly THEN every measure SHALL stay
  finite, whatever the slider values.
- REQ-42: WHEN a requirement above states an invariant THEN the repository
  SHALL ship a property test named after its REQ number, and CI SHALL run it.

## Lab depth (the two 3D labs)

- REQ-43: The chemistry lab SHALL model real aqueous stoichiometry: molar
  dilution, charge-balance pH over strong and weak acids and bases, heat of
  neutralization, insoluble precipitates with a mass in grams, CO2 evolution
  with a headspace pressure, and a pH indicator colour.
- REQ-44: WHEN a reagent combination is simulated THEN pH SHALL stay within
  [0, 14], temperature within [0, 100] degrees C, and every measure SHALL stay
  finite, for any combination of doses and any burette volume.
- REQ-45: The bridge lab SHALL offer at least six structural materials, each
  with its own cost, maximum span, stiffness, strength and self-weight, and
  each belonging to a family (beam: tension and compression; cable: tension
  only; arch/pier: compression only).
- REQ-46: WHEN a member is longer than its material allows, or would exceed the
  site budget, or is not in the site palette THEN the placement SHALL be refused
  with a message naming the reason.
- REQ-47: WHEN a member snaps THEN it SHALL stay visible as a broken stub and the
  test SHALL end as a collapse.
