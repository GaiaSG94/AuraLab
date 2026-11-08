# Créer un labo (guide prof, sans coder)

> Tout se passe dans un fichier texte : la **fiche de préparation** (`config.json`).
> Les *étiquettes* affichées sont en français libre ; les *mots de structure* restent en anglais fixe.

## Méthode recommandée : copier un labo existant

1. Copiez le dossier `app-eco/` vers `app-mon-labo/`.
2. Ouvrez `app-mon-labo/config.json` dans un éditeur de texte (Bloc-notes, VS Code...).
3. Modifiez titres, effectifs, couleurs, consignes (détails ci-dessous).
4. Lancez `start-lab.bat`, ouvrez `http://localhost:8080/app-mon-labo/`, rafraîchissez à chaque modification.
5. Erreur ? Un panneau rouge explique en clair (section « Erreurs fréquentes »).
6. Pour distribuer aux élèves : régénérez l'autonome (`node scripts/build-standalone.mjs`,
   demande Node.js — sinon distribuez le dossier + `start-lab.bat`, ça marche aussi).

## La fiche, rubrique par rubrique

- `lab` : `title` (titre affiché), `subtitle`, `page` (couleur de fond de la page, ex. `#5b8cff` ;
  le texte est noir, choisissez une couleur moyenne ou claire), `accent` (couleur d'accent, ex. `#ffb454`),
  `note` (phrase affichée en bas de la colonne des étapes), `id` (identifiant unique, sans espaces),
  optionnel `home` (lien du bouton « ← all labs », par défaut `../index.html`).
  L'apparence (étapes, paillasse, volets, fantôme) est la même pour tous les labos : seule `page` change.
- `bench` : `background` (fond), `trail` (0.05–1 : longueur des traînées),
  `speckles` (0–600 : points de fond).
- `bounds` : `wrap` (traverse les bords) ou `bounce` (rebondit).
- `substances` : la liste des populations. Chacune : `id` (unique), `label` (nom affiché),
  `count` (effectif), `color`, `radius` (taille), `mass` (inertie), `speed` (vitesse),
  optionnel `ring: [min, max]` (placement en anneau, labos spatiaux),
  optionnel `links: { distance }` (relier les voisins proches).
- `material` : les appareils. Chacun : `id`, `kind` (type du catalogue, ex. `attractor`),
  `label`, `x`/`y` (position 0–1), puis les réglages du type (`strength` négatif = repousse !).
- `laws` : les lois actives, dans l'ordre : `{ "law": "gravitation" }`, avec optionnels
  `targets: ["lapins"]` (sinon toutes les substances) et `params: {...}`.
  Lois du catalogue particules : `gravitation`, `placement-circulaire`, `errance`, `derive`,
  `poursuite`, `fuite`, `predation`, `reproduction` (voir leurs notices dans le labo, bouton `i`).
- `metrics` : les grandeurs suivies : `id`, `label`, `unit` (ex. `"°C"`, `"individus"`),
  `source` (`counts.<substance>` ou une mesure du labo comme `consumed`), `color` (courbes).
- `instruments` : `chips` (pastilles de valeurs) et/ou `curve` (graphe : `title`, `metrics`, `samples`).
- `controls` : curseurs : `label`, `path` (`substances.<id>.count`, `material.<id>.strength`,
  `laws.<n>.<paramètre>`, `bench.trail`), `min`, `max`, `step`.
- `notebook` : `enabled: true`, `prompts` (questions suggérées affichées dans le carnet).

## Ajouter une loi au catalogue (sans coder la base)

Double-cliquez `add-element.bat` : 6 questions en français → le module est créé, enregistré
et documenté. Il reste à remplir le comportement (le fichier généré guide, avec exemples :
`gravitation.js` pour une force, `poursuite.js` pour un pilotage). Puis :
`node scripts/validate-config.mjs` pour tout contrôler.

## Erreurs fréquentes

- `unknown law "X"` : faute de frappe — comparez avec la liste ci-dessus.
- `unknown substance "Y"` : un `targets` ou une paire cite un `id` inexistant.
- `must point to a numeric value` : un slider pointe vers un chemin qui n'existe pas
  (vérifiez `substances.<id>.count`, indices `laws.<n>` à partir de 0).
- `total particles ... exceeds cap 1500` : baissez les effectifs (fluidité garantie).
- Page blanche + message de chargement : vous avez double-cliqué `app-*/index.html` —
  utilisez `start-lab.bat` + `http://localhost:8080/...` ou les fichiers `dist/`.

## Règles d'or

1. Ne touchez jamais à `core/` : tout un labo tient dans son dossier.
2. Une modification = un rafraîchissement : itérez petit.
3. Chaque loi/matériel a sa notice (formule, sources, limites) : lisez-la avant d'emprunter.
4. Testez les valeurs extrêmes avec les curseurs : un labo ne doit jamais crasher.
