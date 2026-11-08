// LabKit core — unified catalog, organized by categories.
// The catalog is the single list of everything a lab can order:
// laws, apparatus, instruments (+metrics), substances molds, surfaces.
// Built-ins ship with the kit; packs and labs extend it. Merged at boot.

export const builtinInstruments = {
  chips: {
    label: "Counter",
    notice: {
      label: "Counter",
      formule: "Shows one live readout per metric (value + unit), refreshed every frame.",
      sources: "Kit built-in readout (no model).",
      limites: "No history; for trends use the curve instrument.",
    },
  },
  curve: {
    label: "Curve",
    notice: {
      label: "Curve",
      formule: "Samples each listed metric every 0.25 s and draws one line per metric.",
      sources: "Kit built-in chart (no model).",
      limites: "Fixed sample count window; linear time axis only.",
    },
  },
};

export const builtinControls = {
  slider: {
    label: "Slider",
    notice: {
      label: "Slider",
      formule: "Binds a numeric config path to a [min, max] range control.",
      sources: "Kit built-in control (no model).",
      limites: "Numbers only; one path per slider.",
    },
  },
};

export const builtinSurfaces = {
  stage: {
    label: "Stage",
    notice: {
      label: "Stage",
      formule: "Main 2D canvas: background + optional speckles + lab drawing, with motion trails.",
      sources: "Kit built-in surface (no model).",
      limites: "2D only; one stage per lab.",
    },
  },
  webgl: {
    label: "WebGL stage",
    notice: {
      label: "WebGL stage",
      formule: "The lab mounts its own 3D canvas in the stage box; the shell keeps header, steps, instruments and loop.",
      sources: "Kit built-in surface (no model).",
      limites: "One stage per lab; 3D content is 100% lab-owned.",
    },
  },
};

// Merge pack manifests + lab-local additions into one catalog.
// Each manifest: { laws?: {id: lawModule}, apparatus?: {kind: {notice, defaults}} }
export function mergeCatalog(manifests) {
  const catalog = { laws: {}, apparatus: {} };
  for (const m of manifests) {
    if (!m) continue;
    Object.assign(catalog.laws, m.laws || {});
    Object.assign(catalog.apparatus, m.apparatus || {});
  }
  return catalog;
}

// Flat list of one category for "+" menus and docs: [{id, label, notice}]
export function listCategory(catalog, category) {
  const buckets = {
    laws: catalog.laws,
    apparatus: catalog.apparatus,
    instruments: builtinInstruments,
    controls: builtinControls,
    surfaces: builtinSurfaces,
  };
  const bucket = buckets[category] || {};
  return Object.keys(bucket).map((id) => ({
    id,
    label: (bucket[id] && (bucket[id].label || (bucket[id].notice && bucket[id].notice.label))) || id,
    notice: (bucket[id] && bucket[id].notice) || null,
  }));
}

export function getLaw(catalog, id) {
  return catalog.laws[id] || null;
}
