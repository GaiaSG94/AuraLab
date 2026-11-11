# AGENTS.md — LabKit

Ce dépôt est un **template de labos éducatifs virtuels** : un core partagé,
un catalogue, et des labos qui ne diffèrent que par leurs données.
Kiro intervient **au build-time uniquement** : les labos tournent hors-ligne,
sans crédits, sans clés API, sans backend.

## Règles non négociables

1. **Zéro dépendance, zéro build obligatoire.** Pas de `package.json`, pas
   de bundler, pas de framework. Le HTML/CSS/JS est servi tel quel.
2. **Le core ne connaît aucune science.** `core/` n'importe rien de
   `app-*/` ni de `engines/*` et ne nomme aucun phénomène. Un besoin
   nouveau devient une **extension du schéma** (`core/validate.js` +
   `core/catalog.js` + la doc), jamais une branche de labo.
3. **`core/validate.js` est l'unique source de vérité** du schéma. Le
   navigateur, le validateur Node, les tests et le serveur MCP l'importent
   tous. Ne jamais dupliquer une vérification de plage.
4. **Échec gratuit.** Un nombre aberrant est borné avec un avertissement ;
   seule une erreur structurelle bloque — et elle **nomme la valeur
   fautive**.
5. **Les lois ne touchent jamais le DOM** (REQ-15) : elles reçoivent
   `world`, `dt`, `params`, `targets`, `active`. C'est ce qui les rend
   testables en Node.
6. **Toute loi porte une notice** : règle (`formule`), sources, limites.
7. **Toute garantie nouvelle a une propriété** nommée d'après son
   exigence (`REQ-xx`) dans `tests/properties-*.mjs`.
8. **Fichiers < 500 lignes, fonctions < 50 lignes.**
9. **`dist/` est généré et committé.** Le reconstruire dans le même commit
   que la source qui l'a rendu obsolète ; la CI échoue sur la dérive.

## Commandes

```powershell
node scripts/validate-config.mjs    # valide tous les app-*/config.json
node scripts/build-standalone.mjs   # reconstruit dist/*.html
node tests/run-tests.mjs            # propriétés (PBT) extraites des REQ
node scripts/validate-workflows.mjs # valide les recettes .kiro/workflows/
node mcp-server/smoke-test.mjs      # pilote le serveur MCP de bout en bout
python3 .github/hermes/ci_fmt.py    # porte de formatage
```

## Créer un labo

Copier `app-eco/` (2D) ou `app-chimie/` (3D) vers `app-<nom>/`, écrire
`config.json`, câbler `lab.js`, valider, construire l'autonome. Les détails
sont dans `.kiro/steering/creer-un-labo.md` (agents) et `CREER-UN-LABO.md`
(profs, en français).

## Le workflow Kiro du dépôt

| Surface | Emplacement | Rôle |
|---|---|---|
| Specs | `.kiro/specs/` | exigences EARS, design, tâches |
| Steering | `.kiro/steering/` | product, tech, structure, architecture, design system |
| Hooks | `.kiro/hooks/` | validation au save, garde avant commit, cycle de vie |
| Agents | `.kiro/agents/` | `lab-architect`, `law-smith`, `config-doctor`, `lab-reviewer` |
| Skills | `.kiro/skills/` | `create-lab`, `add-law`, `package-standalone` |
| Workflows | `.kiro/workflows/` | `new-lab`, `fix-until-green`, `audit-labs` |
| MCP | `.kiro/settings/mcp.json` | serveur `labkit` (5 outils) |
| Power | `power-labkit/` | package installable (manifest, MCP, skills) |

## Ce que l'agent ne doit pas faire

- Toucher `core/` pour faire marcher un labo.
- Modifier `dist/` à la main.
- Ajouter une dépendance.
- Supprimer une propriété ou une exigence pour faire passer une CI.
- Pousser sans que `dist/` soit à jour.
