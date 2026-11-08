// Chemistry pack manifest — mixing laws, glassware apparatus, exposed measures.
import { melangeCouleurs } from "./laws/melange-couleurs.js";
import { reactionAcide } from "./laws/reaction-acide.js";
import { chauffage } from "./laws/chauffage.js";

export const chimieLaws = {
  "melange-couleurs": melangeCouleurs,
  "reaction-acide": reactionAcide,
  chauffage,
};

export const chimiePack = {
  id: "chimie",
  laws: chimieLaws,
  apparatus: {
    recipient: {
      label: "Flask",
      notice: {
        label: "Erlenmeyer",
        formule: "Holds up to 500 mL; the level follows the poured volume.",
        sources: "Glassware declared by the lab.",
        limites: "One flask; no overflow simulated.",
      },
      defaults: { x: 0.4, y: 0.62 },
    },
    bruleur: {
      label: "Bunsen burner",
      notice: {
        label: "Bunsen burner",
        formule: "Heats at strength % (0–100) when the box is checked.",
        sources: "Apparatus declared by the lab.",
        limites: "Single flame; no air control.",
      },
      defaults: { x: 0.4, y: 0.9, strength: 60 },
    },
  },
  measures: [
    { id: "temp", label: "Temperature", unit: "°C" },
    { id: "ph", label: "pH", unit: "" },
    { id: "volume", label: "Volume", unit: "mL" },
  ],
};
