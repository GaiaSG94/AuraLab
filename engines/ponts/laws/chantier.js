// Law: chantier — the site rules: budget and the material palette live in params.
import { MATERIALS, MATERIAL_IDS } from "../materials.js";

function priceList() {
  return MATERIAL_IDS.map((id) => `${MATERIALS[id].label} = ${MATERIALS[id].cost}`).join(", ");
}

export const chantier = {
  id: "chantier",
  notice: {
    label: "Site rules",
    formule: `Budget per site; costs — ${priceList()}. The road must link both banks.`,
    sources: "Game rules (not a physics model).",
    limites: "Designs are saved locally, per site.",
  },
  defaults: { budget: 120 },
  apply() { /* rules only; the world enforces them */ },
};
