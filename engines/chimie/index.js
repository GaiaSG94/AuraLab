// Chemistry pack manifest — stoichiometric laws, glassware apparatus, 5 exposed measures.
import { dilution } from "./laws/dilution.js";
import { equilibreAcidoBasique } from "./laws/equilibre-acido-basique.js";
import { enthalpieReaction } from "./laws/enthalpie-reaction.js";
import { precipitation } from "./laws/precipitation.js";
import { degagementGazeux } from "./laws/degagement-gazeux.js";
import { indicateurColore } from "./laws/indicateur-colore.js";
import { ebullition } from "./laws/ebullition.js";

export const chimieLaws = {
  dilution,
  "equilibre-acido-basique": equilibreAcidoBasique,
  "enthalpie-reaction": enthalpieReaction,
  precipitation,
  "degagement-gazeux": degagementGazeux,
  "indicateur-colore": indicateurColore,
  ebullition,
};

export const chimiePack = {
  id: "chimie",
  laws: chimieLaws,
  apparatus: {
    recipient: {
      label: "Erlenmeyer 500 mL",
      notice: {
        label: "Erlenmeyer 500 mL",
        formule: "Holds up to 500 mL; liquid height and solid precipitate layer follow reaction stoichiometry.",
        sources: "Standard borosilicate laboratory glassware.",
        limites: "Overflow above 500 mL is clamped.",
      },
      defaults: { x: 0.38, y: 0.62 },
    },
    bruleur: {
      label: "Bunsen burner",
      notice: {
        label: "Bunsen burner",
        formule: "Heats at strength % (0–100) when switched on.",
        sources: "Apparatus declared by the lab.",
        limites: "Single flame; no air-collar adjustment.",
      },
      defaults: { x: 0.38, y: 0.9, strength: 60 },
    },
    burette: {
      label: "Titration burette",
      notice: {
        label: "Graduated burette (NaOH 0.1 M)",
        formule: "Dispenses 1 mL or 5 mL drops of NaOH 0.1 M into the flask for acid-base titration.",
        sources: "Volumetric titration glassware (0–50 mL).",
        limites: "Fixed titrant: NaOH 0.1 M.",
      },
      defaults: { x: 0.38, y: 0.25, strength: 0 },
    },
  },
  measures: [
    { id: "temp", label: "Temperature", unit: "°C" },
    { id: "ph", label: "pH", unit: "" },
    { id: "volume", label: "Volume", unit: "mL" },
    { id: "precipite", label: "Precipitate", unit: "g" },
    { id: "pression", label: "Pressure", unit: "kPa" },
  ],
};
