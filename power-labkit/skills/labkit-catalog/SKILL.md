---
name: labkit-catalog
description: Look up the LabKit catalog - the laws, apparatus and instruments a lab can use, each with its rule, its sources and its limits. Use when choosing what a new lab should contain, or when a config cites an unknown element.
license: MIT
---

# The LabKit catalog

A lab is built from catalog entries. Each one carries a notice: the **rule**
it applies, the **sources** it comes from, and the **limits** of what it
models. Read the notice before using an entry: some are real science, some
are game rules written for a lab.

## How to read the catalog

With the MCP server (`labkit`), call `list_catalog` with an optional
`category`:

- `laws` — the behaviours: `gravitation`, `errance`, `derive`, `poursuite`,
  `fuite`, `predation`, `reproduction`, `placement-circulaire` (particles);
  `melange-couleurs`, `reaction-acide`, `chauffage` (chemistry);
  `chantier`, `gravite`, `rupture`, `charge-flottante` (bridge).
- `apparatus` — the material a lab can declare: an attractor, a flask, a
  burner, a ghost, a pylon.
- `instruments` — the built-in readouts: `chips` (live values) and `curve`
  (history).

## Choosing the laws of a lab

Ask three questions:

1. **What changes?** A population that wanders needs `errance`; one that
   drifts needs `derive`; one held in orbit needs `placement-circulaire` plus
   `gravitation`.
2. **What interacts?** `poursuite` and `fuite` need a pair of substances
   (`params.pairs`); `predation` removes the prey on contact and counts it in
   the `consumed` measure.
3. **What does the student see?** Every law must change something a measure
   can read, or a slider can move. A law with no observable effect is noise.

## The vocabulary

| Word | Meaning |
|---|---|
| substances | the populations of the lab (`substances[]` in the config) |
| material | the apparatus (`material[]`) |
| laws | the active rules (`laws[]`), applied in order |
| metrics | the quantities measured (`metrics[]`), each with a unit |
| instruments | the devices that display the metrics |
| bench | the scene (background, trails, speckles) |
| notebook | the notes, snapshots and restore |

## Rules that keep a lab honest

- A law is a **module**, not a script: one file, one rule, no DOM.
- A law that removes particles must increment `world.stats.consumed`.
- A law that models reality must say so in `sources`; a law that is a toy
  must say so too. The student can tell which is which.
- The core stays generic: a lab-specific need becomes a **schema extension**,
  never a branch in the core.
