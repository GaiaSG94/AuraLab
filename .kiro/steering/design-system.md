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
- Exception: Bridge Lab (`app-ponts`) is a headless full-screen 3D game with
  its own interface (`engines/ponts/mapview.js` + `hud.js`). Golden-hour
  low-poly valley; frosted-glass HUD floating on the edges: brand (ghost +
  lowercase name), sites and score/home on top, tool dock on the left, sensors
  card (laws, ghost, log) on the right, budget ring + hint + Test at the
  bottom. Gradients and glass are allowed here because the 3D scene shows
  through; keep the bridge clear in the middle of the screen.
- Exception: Chemistry Lab (`app-chimie`) is also headless and full-screen 3D
  (`engines/chimie/benchview.js` + `hud.js`, design "blown glass"). Real glass
  on the flat page green `#6cc95a`, no dark bench: slim dropper bottles on the
  left (dose pill under each, click a bottle to pour), Erlenmeyer on a tripod
  over the Bunsen burner in the middle (thermometer dipped in), the 3D flask
  ghost watching on the right. Frosted-glass HUD: brand + Lab/Laws/Knobs/
  Notebook tabs + home on top, measure cards on the right, time + status +
  Measure at the bottom. `lab.js` stays for the validator / MCP server.
- The 3D ghost (both 3D labs) has a wavy, swaying hem instead of a round
  bottom, eyes that follow the pointer (else the experiment) and blink. In the
  Chemistry Lab it also has moods: watches the flask, looks at the viewer,
  turns around, or flies up and lands. Still when reduced motion is set.
