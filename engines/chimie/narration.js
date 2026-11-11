// Plain-language description of the current flask contents, for the HUD status
// line. DOM-free so it can be unit-tested headlessly.
const PH_ZONE = [
  { max: 3.0, label: "strongly acidic", hex: "#ef4444" },
  { max: 6.0, label: "acidic", hex: "#f97316" },
  { max: 8.0, label: "near neutral", hex: "#22c55e" },
  { max: 11.0, label: "basic", hex: "#3b82f6" },
  { max: 14.1, label: "strongly basic", hex: "#7c3aed" },
];

export function phZone(ph) {
  return PH_ZONE.find((z) => ph < z.max) || PH_ZONE[PH_ZONE.length - 1];
}

export function describeState(world, present) {
  if (world.volume <= 0) {
    return { text: "Empty flask: pour a reagent, or titrate from the burette", colors: [] };
  }
  const bits = [];
  const colors = present.map((s) => s.color);
  if (world.eqPoint) bits.push("equivalence point reached");
  const zone = phZone(world.ph);
  bits.push(`pH ${world.ph.toFixed(2)} (${zone.label})`);
  if (world.precipite > 0.001) {
    bits.push(`${world.precipite.toFixed(3)} g of precipitate`);
  }
  if (world.cuComplex) bits.push("deep-blue [Cu(NH3)4]2+ complex");
  if (world.gasFizz > 0.05) bits.push("CO2 bubbling out");
  if (world.boiling) bits.push("boiling");
  else if (world.heating) bits.push("heating");
  if (world.temp > 25) bits.push(`${world.temp.toFixed(1)} °C`);
  if (world.pression > 105) bits.push(`${world.pression.toFixed(0)} kPa`);
  return { text: bits.join(" · "), colors };
}
