// Law: indicateur-colore — determines the optical tint of the flask solution.
// Bromothymol blue (BBT): yellow (pH < 6.0) -> green (6.0-7.6) -> blue (pH > 7.6).
// Otherwise reflects copper(II) aqua ion (cyan) or [Cu(NH3)4]2+ complex (deep royal blue).
export const indicateurColore = {
  id: "indicateur-colore",
  notice: {
    label: "Color indicator (BBT & ions)",
    formule: "BBT: yellow pH<6.0, green 6.0-7.6, blue pH>7.6. Cu2+ aqua: cyan; [Cu(NH3)4]2+: royal blue.",
    sources: "Bromothymol blue pKa = 7.1; ligand-field splitting of [Cu(NH3)4(H2O)2]2+.",
    limites: "No Beer-Lambert absorbance curve; binary complex dominance.",
  },
  defaults: {},
  apply(world) {
    if (!world.mmol || world.volume <= 0) {
      world.liquidHex = "#d8eef5";
      return;
    }
    const m = world.mmol;
    if (m.bbt > 0) {
      const ph = world.ph;
      if (ph < 6.0) world.liquidHex = "#eab308"; // acidic yellow
      else if (ph <= 7.6) world.liquidHex = "#16a34a"; // neutral green
      else world.liquidHex = "#2563eb"; // basic blue
      return;
    }
    if (world.cuComplex) {
      world.liquidHex = "#1e3a8a"; // deep royal blue [Cu(NH3)4]2+
      return;
    }
    if (m.cuso4 > 0.05) {
      world.liquidHex = "#38bdf8"; // Cu2+ sky-cyan
      return;
    }
    world.liquidHex = "#cfe9f2"; // clear aqueous solution
  },
};
