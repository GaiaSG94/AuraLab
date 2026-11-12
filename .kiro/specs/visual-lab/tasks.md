# visual-lab — Tasks

Agent-executable build plan. Each task ends with an observable check.

- [x] 1. Shell + catalog + new-schema validator (`core/`)
  - Check: `node scripts/validate-config.mjs` passes on all labs.
- [x] 2. Particle pack as world + 8 composable law modules (`engines/particles/`)
  - Check: headless 600 steps per lab, no NaN; predation off => consumed=0.
    Automated as property tests (`tests/properties-labs.mjs`, REQ-41/42).
- [x] 3. Rewire the 2D labs (config + `lab.js` + explicit `index.html`)
  - Check: both load over HTTP with 200; identical behavior to v1.
- [x] 4. Category sections with checkboxes + notices, metrics with units
  - Check: headless DOM shows rows, notices, live counts.
- [x] 5. Notebook v1 (notes + snapshots + restore + persistence)
  - Check: headless DOM shows notebook; snapshot round-trips params.
- [x] 6. `add-element` guided prompt (+ `.bat`) scaffolding catalog laws
  - Check: generated law validates and appears in pack index.
- [x] 7. Standalone rebuild + harassment checks
  - Check: dist bytes execute 60 frames headless; screenshots reviewed.
- [x] 8. Teacher guide (FR) + INTENT + specs sync
  - Check: a non-dev follows CREER-UN-LABO.md and adapts a lab.
- [x] 9. Two 3D labs on the same kit (`app-chimie`, `app-ponts`), each with a
  DOM-free `lab.js` for the validator, the MCP server and the tests
  - Check: `headless_check` returns finite measures for all four labs.
- [ ] 10. GitHub Pages portal link + demo video (portal → labs → repo diff → .kiro)
  - Check: under 3 min, both labs visible, no console errors.
- [x] 11. MCP dev server (list_catalog, validate_lab, scaffold_law, list_labs,
  headless_check) + workspace config + smoke test
  - Check: stdio probe drives all tools; `node mcp-server/smoke-test.mjs`.
- [x] 12. Two 3D labs rebuilt on real science: chemistry (8 reagents, 7 stoichiometric laws, 5 measures, burette) and bridge (ten structural materials, tension/compression families, self-weight law, per-level palettes, material dock with colour chips and span preview)
  - Check: 15 chemistry + 9 bridge properties hold; 13/13 chemistry and 9/9 bridge DOM assertions on the standalone bundles.
- [x] 13. split the 3D renderers into modules under the 500-line rule (chimie: glassware/bench-ghost/benchview/hud-css/hud/narration; ponts: materials/sky/valley-dressing/site-statics/test-ghost/mapview)
  - Check: no file above 500 lines; every bundle still parses (check-dist).
- [ ] 14. Open decisions: guide block, JSONC, scenario buttons (see INTENT.md)
  - Check: user signs off each one, in writing, before any of them lands.
- [x] 15. Bridge Lab levels: generated levels (REQ-55/58), purse economy with a
  single Next step (REQ-56/57), valley and world rebuilt per level, saved run
  - Check: levels suite in `node tests/run-tests.mjs`; `dist/labkit-ponts.html`
    boots in headless Chrome on level 1 with the starting purse.
- [x] 16. Chemistry HUD moved to a left column (8 substances with −/+ dose, 5
  live instruments, 7 law switches with notices); the Laws tab and the floating
  dose pills are gone; the manometer sits behind-left so it never overlaps the
  ghost; the ghost's eyes are back (white sclera + dark pupil).
  - Check: 14/14 chemistry DOM assertions on the standalone bundle; no file
    above 500 lines (`hud-left.js` / `hud-shared.js` / `hud-css.js` extracted).
- [x] 17. Chemistry end-to-end scenarios proving the whole bench, not just each
  law in isolation: full titration (equivalence at 25 mL + exotherm), weighed
  precipitation then redissolution, CO2 manometer rise-and-relax, indicator
  colours, every instrument finite, Bunsen boiling.
  - Check: `tests/properties-chemistry-scenarios.mjs` in `node tests/run-tests.mjs`
    (68/68 properties).

> Tasks 10 and 14 are the only open work. Everything else is implemented,
> tested and gated by CI.
