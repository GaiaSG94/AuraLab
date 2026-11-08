// Law: chantier — the game rules: budget and beam costs live in params.
export const chantier = {
  id: "chantier",
  notice: {
    label: "Site rules",
    formule: "Budget 120: beam = 10, cable = 5. The road must link both banks.",
    sources: "Game rules (not a physics model).",
    limites: "Designs are saved locally, per site.",
  },
  defaults: { budget: 120 },
  apply() { /* rules only; the world enforces them */ },
};
