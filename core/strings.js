// LabKit core — shell UI strings (English/French). Labs pick via lab.lang ("en" default).
export const STR = {
  en: {
    allLabs: "← all labs",
    labSteps: "Lab steps",
    stepLab: "Lab", stepLabHint: "Substances, material, instruments",
    stepLaws: "Laws", stepLawsHint: "How it behaves",
    stepKnobs: "Knobs", stepKnobsHint: "Change the amounts",
    stepNotebook: "Notebook", stepNotebookHint: "Write what you see",
    bench: "Bench", benchHint: "Watch it happen",
    substances: "Substances", material: "Material",
    noSubstance: "No substance in this lab.", noMaterial: "No material in this lab.",
    instruments: "Instruments · measuring devices",
    lawsOn: "on",
    enable: "Enable", about: "About",
    reset: "Reset", step1: "+1 step", pause: "❚❚ Pause", play: "▶ Play",
    autotuned: (n) => `Auto-tuned ${n} value(s), see console.`,
    invalidConfig: "Invalid config:",
    counter: "Counter", liveValues: "Live values", curve: "Curve", history: "History",
    notePlaceholder: "Write what you see…", noteAria: "Notebook note", noteBtn: "Note",
    recordBtn: "● Record measures", recordTitle: "Record measures at this instant",
    snapshots: "Snapshots", restore: "Restore", deleteNote: "Delete note", deleteSnapshot: "Delete snapshot",
  },
  fr: {
    allLabs: "← tous les labos",
    labSteps: "Étapes du labo",
    stepLab: "Labo", stepLabHint: "Substances, matériel, instruments",
    stepLaws: "Lois", stepLawsHint: "Comment ça se comporte",
    stepKnobs: "Réglages", stepKnobsHint: "Changer les quantités",
    stepNotebook: "Carnet", stepNotebookHint: "Écris ce que tu vois",
    bench: "Paillasse", benchHint: "Regarde ce qui se passe",
    substances: "Substances", material: "Matériel",
    noSubstance: "Aucune substance dans ce labo.", noMaterial: "Aucun matériel dans ce labo.",
    instruments: "Instruments · appareils de mesure",
    lawsOn: "sur",
    enable: "Activer", about: "À propos de",
    reset: "Réinitialiser", step1: "+1 pas", pause: "❚❚ Pause", play: "▶ Lecture",
    autotuned: (n) => `${n} valeur(s) auto-réglée(s), voir la console.`,
    invalidConfig: "Config invalide :",
    counter: "Compteur", liveValues: "Valeurs directes", curve: "Courbe", history: "Historique",
    notePlaceholder: "Écris ce que tu vois…", noteAria: "Note du carnet", noteBtn: "Noter",
    recordBtn: "● Enregistrer les mesures", recordTitle: "Enregistrer les mesures à cet instant",
    snapshots: "Instantanés", restore: "Restaurer", deleteNote: "Supprimer la note", deleteSnapshot: "Supprimer l'instantané",
  },
};

export function strings(config) {
  const lang = config && config.lab && config.lab.lang;
  return STR[lang] || STR.en;
}
