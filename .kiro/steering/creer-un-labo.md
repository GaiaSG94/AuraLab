---
inclusion: manual
---

# Steering — Créer un labo (procédure complète)

> Cette fiche s'inclut à la demande (`#creer-un-labo`) ou via le guide
> `CREER-UN-LABO.md` pour les profs non techniques.

## Étape 1 — Copier un labo existant

```powershell
Copy-Item -Recurse app-eco app-mon-labo
```

Un labo = un dossier. Jamais de modification de `core/` pour un labo.

## Étape 2 — Écrire la fiche de préparation (`config.json`)

C'est ici que vit **tout** le contenu du labo. Rubriques :

| Rubrique | Ce qu'on y met |
|---|---|
| `lab` | `id`, `title`, `subtitle`, `page` (couleur de fond), `accent`, `note`, `lang` |
| `bench` | `background`, `trail` (0.05–1), `speckles` (0–600) |
| `bounds` | `wrap` ou `bounce` |
| `substances` | les populations : `id`, `label`, `count`, `color`, `radius`, `mass`, `speed`, `ring?`, `links?` |
| `material` | les appareils : `id`, `kind` (du catalogue), `label`, `x`/`y`, réglages |
| `laws` | les lois actives, dans l'ordre : `{ "law": "<id>", "targets"?, "params"? }` |
| `metrics` | les grandeurs : `id`, `label`, `unit`, `source`, `color` |
| `instruments` | `chips` (pastilles) et/ou `curve` (courbe) |
| `controls` | les curseurs : `path`, `label`, `min`, `max`, `step` |
| `notebook` | `enabled`, `prompts` (questions guidées) |

Les mots de structure restent en anglais ; les libellés affichés sont libres.

## Étape 3 — Câbler le labo (`lab.js`)

Pour un labo 2D : `buildLab(api, config)` renvoie `{ state, step, draw,
reset, resync, setSize, measures }`. Copier `app-space/lab.js` et changer
l'import du pack.

Pour un labo 3D : `lab.js` reste identique (il sert au validateur et au
serveur MCP), et `game.js` monte l'interface 3D.

## Étape 4 — Valider

```powershell
node scripts/validate-config.mjs
```

Les nombres aberrants sont corrigés automatiquement (avec un avertissement).
Les erreurs structurelles bloquent, et nomment la valeur fautive.

## Étape 5 — Voir le résultat

```powershell
./start-lab.bat
```

Puis <http://localhost:8080/app-mon-labo/>. Un rafraîchissement suffit après
chaque modification.

## Étape 6 — Distribuer

```powershell
node scripts/build-standalone.mjs
```

Produit `dist/labkit-mon-labo.html` : un fichier unique, double-cliquable,
hors ligne. C'est ce que reçoit un élève.

## Étape 7 — Écrire les tests

Toute nouvelle garantie du labo devient une propriété nommée
`REQ-xx` dans `tests/properties-*.mjs`. Voir `.kiro/steering/architecture.md`.

## Erreurs fréquentes

- `unknown law "X"` — faute de frappe sur l'id de loi ; comparer avec la
  liste du catalogue (`list_catalog` du serveur MCP).
- `unknown substance "Y"` — une cible de loi ou une paire cite un id absent.
- `must point to a numeric value` — un curseur pointe vers un chemin
  inexistant (`substances.<id>.count`, `material.<id>.strength`,
  `laws.<n>.<param>` ; les indices de lois commencent à 0).
- `total particles ... exceeds cap 1500` — baisser les effectifs.
- Page blanche — le dossier a été ouvert en `file://` ; utiliser
  `start-lab.bat` ou le fichier `dist/`.
