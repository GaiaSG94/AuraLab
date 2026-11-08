# Steering — Architecture

Project-wide rules for any agent or contributor working in this repo.

- The core stays generic. `core/` must never import from `app-*/` or mention
  planets, rabbits or any lab-specific concept. New lab needs belong in the
  config schema (with validator + docs), not in lab branches in core code.
- `core/sim.js` stays DOM-free and Node-importable. If you add sim logic,
  keep it seedable and deterministic-friendly (RNG passed in or local).
- `core/validate.js` is the single source of schema truth. Browser and Node
  both import it; never duplicate range checks elsewhere.
- Auto-tune, don't crash: bad numbers get clamped with a warning; only
  structural violations (missing title, unknown target, bad control path)
  are errors.
- Zero dependencies, no build step. Any static file server must serve the
  repo as-is. Do not add npm packages, bundlers or frameworks.
- New labs are folders: `app-<name>/index.html` + `app-<name>/config.json`.
  If a lab needs a core change, extend the schema for all labs instead.
- Keep files small and readable: this is a hackathon template judged on
  cleanliness. Prefer deleting code over abstracting it.
