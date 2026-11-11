// Chemistry HUD shared helpers: icon set and escaping.
// Kept in one module so the HUD and its left column never drift apart.

const CH_ICONS = {
  back: '<path d="M15 6l-6 6 6 6"/>',
  pause: '<path d="M9 5.5v13M15 5.5v13" stroke-width="2.8"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>',
  empty: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
  step: '<path d="M6 5v14M10 12h9M15 8l4 4-4 4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  next: '<path d="M9 6l6 6-6 6"/>',
};

export const chIcon = (k) => `<svg class="ch-i" viewBox="0 0 24 24" aria-hidden="true">${CH_ICONS[k]}</svg>`;

export const chEsc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
