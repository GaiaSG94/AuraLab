# Steering — Design system

Visual rules for every AuraLab page. They live in `core/styles.css`,
`core/shell.js` and `core/ghost.js`, so any lab built on `core/` looks the
same without writing CSS.

- Page: one flat color per lab, from `lab.page` (space `#5b8cff`, eco
  `#6cc95a`, portal `#ff8a3d`). Ink text (`#17141f`) sits on it, so keep the
  color mid-light. No gradients, no glassmorphism, no shadows on cards.
- Layout (lab): header (ghost logo, lab name in lowercase, "← all labs"),
  then three columns that never overlap: steps | bench | panel.
  - Steps (left): Lab, Laws, Knobs, Notebook (only the declared ones), then
    the lab note and Pause / Reset / +1 step at the bottom.
  - Bench (center): ink card holding the canvas at its real pixel size.
    Nothing is drawn over the scene.
  - Panel (right): paper card showing one step at a time. The Lab step shows
    substances (jar icons), material and instruments together.
- Instruments are measuring devices, never styled like substances: grey box,
  gauge icon, black screen with green mono readouts (counter) or lines (curve).
- Type: Archivo condensed 900 in caps for titles, Archivo for text,
  JetBrains Mono for numbers. System fonts take over offline.
- Accent `lab.accent` stays in the config for older labs; the page color does
  the theming. Particle colors come from the substances.
- The flask ghost (`core/ghost.js`) is the logo and the notebook guide: eyes
  follow the pointer, blink, close on hover; bubbles rise from the flask.
  Static when `prefers-reduced-motion` is set; the lab then starts paused.
- New labs inherit all of this by using `core/`. Do not restyle per lab beyond
  `lab.page` and `bench.background`.
