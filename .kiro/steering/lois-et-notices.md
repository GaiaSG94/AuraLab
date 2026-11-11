---
inclusion: auto
name: lois-et-notices
description: Rules for writing a new law module, its notice, its registration in the pack and its tests. Use when creating or modifying a law, an apparatus kind, a pack or the catalog.
---

# Steering — Lois, notices et catalogue

## Anatomie d'une loi

Une loi est **un fichier, une responsabilité**. Elle vit dans
`engines/<pack>/laws/<id>.js` et s'exporte ainsi :

```js
export const maLoi = {
  id: "ma-loi",
  notice: {
    label: "Ma loi",
    formule: "La règle en une phrase, avec les symboles.",
    sources: "Science établie (référence) ou règle inventée (ad-hoc).",
    limites: "Ce que la loi ne modélise PAS.",
  },
  defaults: { k: 1 },
  apply(world, dt, params, targets, active) { /* ... */ },
};
```

Points non négociables :

- **`id` = nom du fichier**, en kebab-case, sans accent.
- **La notice est obligatoire** : `formule`, `sources` et `limites` ne sont
  jamais vides. Une loi sans notice est incomplète, et la propriété
  `REQ-06` du catalogue le vérifie en CI.
- **`defaults`** liste tous les paramètres ajustables de la loi. Un curseur
  du config pointe vers `laws.<n>.<param>`.
- **Pas de DOM.** La loi reçoit `world`, `dt`, `params`, `targets`, `active`.
  Elle ne connaît ni `document` ni `window` : c'est ce qui la rend testable
  en Node (REQ-15).
- **`apply` est idempotent sur un pas** : elle lit l'état et écrit l'état,
  elle n'accumule pas d'historique.
- **Une loi qui retire des particules** incrémente `world.stats.consumed`
  (mesure exposée `consumed`).

## Les quatre formes d'une loi

| Forme | Signature | Exemple |
|---|---|---|
| Force | `apply(world, dt, params, targets, active)` | `gravitation` |
| Pilotage | idem, via `world.steer(...)` | `poursuite` |
| Interaction | idem, une fois par paire | `predation` |
| Placement | `place(world, p, def)` -> booléen | `placement-circulaire` |

## Enregistrer la loi

1. Créer `engines/<pack>/laws/<id>.js`.
2. Importer et lister la loi dans `engines/<pack>/index.js`
   (une ligne d'import, une ligne dans la map).
3. Utiliser `scripts/add-element.mjs` (ou `add-element.bat`) pour générer le
   squelette : il fait les étapes 1 et 2 et laisse un TODO guidé.
4. Déclarer la loi dans le `config.json` d'un labo pour la rendre visible.
5. Écrire la propriété qui garantit son comportement (voir les REQ-10 à 14).

## Le catalogue est une seule liste

`core/catalog.js` fusionne les built-ins et les packs. Toute nouvelle
entrée (loi, appareil, instrument) passe par un manifeste de pack et
**porte une notice**. Le catalogue est l'unique source de vérité : le
validateur refuse une config qui cite une entrée inconnue.

## Vocabulaire

`substances` (les populations), `material` (les appareils), `laws` (les
règles), `metrics` (les grandeurs mesurées), `instruments` (les afficheurs),
`bench` (la paillasse), `notebook` (le carnet). Un terme de science
n'appartient qu'au config du labo, jamais au core.
