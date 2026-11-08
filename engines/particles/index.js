// Particle pack manifest — this pack's catalog contribution:
// composable laws, apparatus kinds and exposed measures.
import { gravitation } from "./laws/gravitation.js";
import { placementCirculaire } from "./laws/placement-circulaire.js";
import { errance } from "./laws/errance.js";
import { derive } from "./laws/derive.js";
import { poursuite } from "./laws/poursuite.js";
import { fuite } from "./laws/fuite.js";
import { predation } from "./laws/predation.js";
import { reproduction } from "./laws/reproduction.js";

export const particleLaws = {
  gravitation,
  "placement-circulaire": placementCirculaire,
  errance,
  derive,
  poursuite,
  fuite,
  predation,
  reproduction,
};

export const particlePack = {
  id: "particles",
  laws: particleLaws,
  apparatus: {
    attractor: {
      label: "Attractor",
      notice: {
        label: "Attractor",
        formule: "Point at (x, y) with strength S; positive attracts, negative repels.",
        sources: "Pack-defined apparatus (used by the gravitation law).",
        limites: "Static position; single strength value.",
      },
      defaults: { x: 0.5, y: 0.5, strength: 100, radius: 20, color: "#ffffff" },
    },
  },
  measures: [{ id: "consumed", label: "Consumed", unit: "" }],
};
