# visual-lab — Tasks

Agent-executable build plan. Each task ends with an observable check.

- [x] 1. Shell + catalog + new-schema validator (`core/`)
  - Check: `node scripts/validate-config.mjs` passes on both labs.
- [x] 2. Particle pack as world + 8 composable law modules (`engines/particles/`)
  - Check: headless 600 steps per lab, no NaN; predation off => consumed=0.
- [x] 3. Rewire both labs (config + `lab.js` + explicit `index.html`)
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
- [ ] 9. Open decisions: guide block, JSONC, scenario buttons, eco-equations (B)?
- [ ] 10. GitHub Pages portal link + demo video (portal → labs → repo diff → .kiro)
  - Check: under 3 min, both labs visible, no console errors.
- [x] 11. MCP dev server (list_catalog, validate_lab, scaffold_law) + workspace config
  - Check: stdio probe drives all tools; scaffolded test law reverted cleanly.
