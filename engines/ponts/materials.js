// Bridge materials — the kit's structural catalogue.
// Three families with real mechanics:
//   beams   carry tension AND compression (wood, steel)
//   cables  carry tension ONLY, and go slack (steel cable, rope)
//   arches  carry compression ONLY, and buckle (arch, concrete pier)
// DOM-free: importable in browsers and in Node.

export const MATERIALS = {
  bois: {
    id: "bois", label: "Wood beam", kind: "beam",
    cost: 10, maxLen: 6.5, stiff: 1.0, strength: 1.0, weight: 1.0,
    color: 0xb8875a,
    notice: {
      label: "Wood beam",
      formule: "Carries tension and compression. Cheap, short, bends under load.",
      sources: "Timber construction (allowable stress ~10 MPa).",
      limites: "No rot, no grain direction.",
    },
  },
  acier: {
    id: "acier", label: "Steel beam", kind: "beam",
    cost: 25, maxLen: 9, stiff: 1.7, strength: 2.4, weight: 1.7,
    color: 0x9fb3c8,
    notice: {
      label: "Steel beam",
      formule: "Carries tension and compression, 1.7x stiffer and 2.4x stronger than wood, but heavy and dear.",
      sources: "Structural steel S275 (E = 210 GPa).",
      limites: "No buckling curve; constant cross-section.",
    },
  },
  cable: {
    id: "cable", label: "Steel cable", kind: "cable",
    cost: 5, maxLen: 12, stiff: 0.5, strength: 1.5, weight: 0.15,
    color: 0x4b5563,
    notice: {
      label: "Steel cable",
      formule: "Tension only: goes slack when shorter than its rest length. Long, light, strong in pull.",
      sources: "Suspension and cable-stayed bridges (7-wire strand).",
      limites: "Cannot push; no sag curve modelled.",
    },
  },
  corde: {
    id: "corde", label: "Rope", kind: "cable",
    cost: 3, maxLen: 8, stiff: 0.15, strength: 0.6, weight: 0.1,
    color: 0xd9c6a5,
    notice: {
      label: "Rope",
      formule: "Tension only, very stretchy and weak. Cheapest member, for light spans only.",
      sources: "Hemp rope (working load ~1/6 of breaking load).",
      limites: "Creep and knots not modelled.",
    },
  },
  arche: {
    id: "arche", label: "Arch", kind: "arch",
    cost: 40, maxLen: 7.5, stiff: 1.3, strength: 3.2, weight: 2.4,
    color: 0xd98d5f,
    notice: {
      label: "Arch",
      formule: "Compression only: buckles when stretched. Very strong under its own curve, heavy.",
      sources: "Masonry and reinforced-concrete arches (thrust line).",
      limites: "Idealised as a straight member; no thrust-line geometry.",
    },
  },
  pilier: {
    id: "pilier", label: "Concrete pier", kind: "arch",
    cost: 30, maxLen: 5, stiff: 2.2, strength: 4.5, weight: 3.2,
    color: 0xa8a29e,
    notice: {
      label: "Concrete pier",
      formule: "Compression only, the stiffest and strongest member, but short and very heavy.",
      sources: "Reinforced concrete C25/30 piers.",
      limites: "No rebar detailing; no foundation settlement.",
    },
  },
};

export const KINDS = {
  beam: { tension: true, compression: true },
  cable: { tension: true, compression: false },
  arch: { tension: false, compression: true },
};

export const MATERIAL_IDS = Object.keys(MATERIALS);

export function getMaterial(id) {
  return MATERIALS[id] || null;
}

export function costOf(id) {
  const m = MATERIALS[id];
  return m ? m.cost : 0;
}

export function maxLenOf(id) {
  const m = MATERIALS[id];
  return m ? m.maxLen : 0;
}

// Which members does a site allow? Sites gate materials to create progression.
export function materialsForSite(site) {
  const allowed = site && site.materials;
  if (!Array.isArray(allowed) || allowed.length === 0) return MATERIAL_IDS;
  return allowed.filter((id) => MATERIALS[id]);
}
