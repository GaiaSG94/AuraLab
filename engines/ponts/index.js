// Bridge pack manifest — game rules, physics laws, apparatus, exposed measures.
import { chantier } from "./laws/chantier.js";
import { gravite } from "./laws/gravite.js";
import { rupture } from "./laws/rupture.js";
import { chargeFlottante } from "./laws/charge-flottante.js";

export const pontsLaws = {
  chantier,
  gravite,
  rupture,
  "charge-flottante": chargeFlottante,
};

export const pontsPack = {
  id: "ponts",
  laws: pontsLaws,
  apparatus: {
    fantome: {
      label: "Test ghost",
      notice: {
        label: "Test ghost",
        formule: "Floats above the deck, bank to bank, when the test starts.",
        sources: "Apparatus declared by the lab.",
        limites: "A single ghost; weight and speed adjustable.",
      },
      defaults: {},
    },
    pylone: {
      label: "Pylon",
      notice: {
        label: "Pylon",
        formule: "Tall fixed anchor for cables.",
        sources: "Lab scenery.",
        limites: "Fixed position.",
      },
      defaults: { x: 0.5, y: 0.2 },
    },
  },
  measures: [
    { id: "fleche", label: "Sag", unit: "mm" },
    { id: "contrainte", label: "Max stress", unit: "%" },
    { id: "cout", label: "Cost", unit: "" },
    { id: "score", label: "Score", unit: "" },
  ],
};
