---
inclusion: always
---

# Steering — Product Overview

LabKit is a **lean template for building virtual education labs**. One shared
core, one shared catalog, and labs that differ only by their data.

## What the product is

A lab is a space where the user manipulates variables and observes results
(hypothesis → action → observation → understanding). LabKit provides the
instruments and the representations; the guidance is only a whiteboard —
proposals, never constraints, never forced steps, never a score.

The template is judged on being **lean**: zero dependency, no bundler, no
framework, no runtime API, no credits. A new lab must cost one folder and one
config file, never a change to the core.

## Who uses it

1. **Students** — receive a single standalone `.html` file, double-click it,
   work offline. They never see the code or the config.
2. **Teachers** — adapt a lab by editing a JSON file (labels, values, units,
   instructions). They never write code and never install Node: the browser
   validates on refresh, and errors are readable.
3. **Developers / contributors** — create labs and engines from the template:
   copy a folder, write the config plus the wiring, validate, build the
   standalone file, share.

## Key features

- **One core, many labs.** `core/` holds zero science: layout, theme, sliders
  bound to config paths, metric readouts, history curves, animation loop,
  config validation.
- **Engines as interchangeable packs.** `engines/<pack>/` contributes laws
  (composable modules), apparatus kinds and measures. Three packs ship today:
  `particles` (2D), `chimie` (3D glassware), `ponts` (3D bridge).
- **The catalog is the single orderable list.** Every law, apparatus and
  instrument carries a notice: rule, sources, limits.
- **Failure is free.** No value — even absurd — may crash a lab. Bad numbers
  are clamped with a warning; only structural problems are errors.
- **Two distribution modes.** Modular sources over a static server (dev) and
  self-contained `dist/*.html` files (students, judges, offline classrooms).
- **Kiro at build time only.** Specs, steering, hooks, MCP, custom agents,
  skills and workflows shape how the kit is built. Nothing at runtime needs
  Kiro, credits or a backend.

## Business objectives for this track

The track (Kiroween Skeleton Crew) judges a template that is clear enough to
be read and flexible enough to be reused, proven by **two distinct
applications** built from the same core. So:

- the core must stay readable enough to be trusted at a glance;
- every lab must be explainable as "same kit, different data";
- the Kiro methodology must be **visible and verifiable**, not decorative.
