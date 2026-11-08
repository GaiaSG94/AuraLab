# Steering — Design system

Visual rules for the AuraLab dashboard (dark lab aesthetic).

- Canvas: near-black background (`#07090c`-ish, per lab), thin motion trails,
  restrained glow only on wells and bodies — never on UI panels.
- UI: flat dark panels (`#12161b`), 1px hairline borders (`#232b34`),
  small radii (4–6px), no gradients, no glassmorphism, no hero sections.
- Accent: exactly one per lab, injected from `lab.accent`. Used sparingly:
  title marker, slider fill, numeric readouts, primary button.
- Type: system stack for labels, monospace for numbers/HUD chips. Uppercase
  micro-labels only for sidebar section titles.
- HUD: small translucent chips over the canvas (counts, fps), plus one
  optional history chart bottom-left. Never cover the action.
- Motion: pause/reset always available; start paused when
  `prefers-reduced-motion` is set.
- New labs inherit all of this for free by using `core/` — do not restyle
  per lab beyond `accent` and `background`.
