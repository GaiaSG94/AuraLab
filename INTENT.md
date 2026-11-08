# INTENT — Vision du projet AuraLab

> Document d'intention : ce que le projet veut devenir.
> Cible : hackathon Kiroween 2026, track Skeleton Crew (template épuré + deux applis distinctes).
> État actuel : socle + 2 labos à particules fonctionnels (voir Journal) ; découpage coquille/moteurs en attente de décision.

## Vision produit

AuraLab est un **kit pour créer des labos éducatifs virtuels** : des espaces interactifs où l'on manipule des
variables et observe des résultats, selon la boucle hypothèse → action → observation → compréhension.

Un labo fournit **outils + représentations**, l'utilisateur y fait ce qu'il veut (terrain libre).
Le guidage (objectif, suggestions, scénarios) n'est qu'un **tableau noir** : propositions effaçables,
zéro contrainte, zéro étape forcée, zéro score. La liberté est l'architecture, le guidage n'est qu'un texte.

Positionnement : pas un SDK lourd, pas une appli fermée — un **template lean** dont chaque nouveau labo
ne coûte qu'un config + quelques dizaines de lignes.

## Utilisateurs (3 profils)

1. **Élèves** — reçoivent un fichier `.html` autonome, double-clic, manipulent hors-ligne sans compte ni
   installation. Ne voient jamais le code ni le config.
2. **Profs** — projettent en classe, adaptent un labo en éditant le JSON (labels, valeurs, langue, consignes),
   sans coder et sans Node (le navigateur valide à lui seul au rafraîchissement). Le JSON lisible est le pont.
3. **Devs / contributeurs** — créent labos et moteurs depuis le template : copier un dossier, écrire le config
   (+ `lab.js` après découpage), valider, générer l'autonome, partager.

## Architecture cible

- **`core/` (la coquille, le kit)** — ne connaît AUCUNE science : layout dashboard, thème, sliders reliés aux
  paramètres, pastilles de mesures (HUD), courbes d'historique, boucle d'animation, validation des configs.
- **`engines/` (moteurs branchables)** — simulations interchangeables via une petite interface commune
  (`init`, `step(dt)`, `draw`, `mesures`) : particules aujourd'hui, équations / optique / autres demain.
- **`app-*/` (les labos)** — config (paramètres, contrôles, labels, guide, scénarios) + `lab.js` de liaison.
  Tous les mots de domaine vivent ici et nulle part ailleurs.
- **Deux modes de diffusion** — sources modulaires via serveur statique (dev) + fichiers `dist/` autonomes
  double-cliquables (élèves, juges, classes sans wifi).

## Principes

- Lean : zéro dépendance, pas de build obligatoire, fichiers petits et lisibles (critère jugé du track).
- Kiro au **build-time uniquement** (specs EARS, steering, hooks dans `.kiro/`) : les labos tournent sans
  crédits, sans clés API, sans backend. L'absence de crédits Kiro ne bloque rien.
- Échec gratuit : aucune valeur (même absurde) ne doit crasher un labo — auto-correction + erreurs lisibles.
- Budget complexité du schéma fixé par le prof bricoleur, pas par le dev.
- Chaque labo a un état par défaut qui raconte une histoire ; la différence entre deux labos est de la donnée.

## Intention Kiro.dev (technologies kiro.dev)

Volonté explicite : le projet utilise les technologies de kiro.dev comme méthode et infrastructure de
conception, de façon visible et vérifiable par les juges :
- Spec-Driven Development : specs EARS (`requirements.md`), `design.md`, `tasks.md` dans `.kiro/specs/`.
- Steering : règles d'architecture et de design système dans `.kiro/steering/`, que tout agent doit suivre.
- Agent Hooks + validation : hook post-sauvegarde branché sur le validateur de configs (garde-fou anti-crash).
- MCP : IMPLÉMENTÉ comme couche dev à usage réel — serveur local `mcp-server/` (zéro dépendance,
  déclaré dans `.kiro/settings/mcp.json`) offrant `list_catalog`, `validate_lab` (auto-approuvés, lecture
  seule) et `scaffold_law` (confirmation à chaque appel, écrit des fichiers). Testé hors Kiro en stdio.
Contrainte assumée (crédits incertains) : Kiro intervient au **build-time, jamais au runtime**. Les labos
tournent sans crédits, sans clés API, sans backend. D'éventuels crédits serviraient à concevoir plus vite,
pas à faire tourner le produit.

## Catégories officielles (décidé 2026-11-07)

Vocabulaire labo adopté pour la coquille et le config : **instruments**, **métriques (grandeurs + unités,
une ou plusieurs par instrument)**, **paillasse** (scène de l'expérience), **carnet de labo** (notes +
enregistrement des mesures à un instant t), **substances**, **matériel**, **lois** (modules composables,
interchangeables, activables par cases à cocher). Règle : le core fournit les présentations génériques
(cartes, sliders, courbes) ; le sens vient du config (`lab.js`, libs `engines/`).
Catalogue unique classé par catégories (tiroirs/niveaux abandonnés comme concepts) ; chaque entrée porte
sa notice (formule, sources, limites) ; extension non-dev via prompt à variables (`add-element.bat`).

## Décisions (état)

Tranchées et implémentées : catégories officielles (7 : instruments, métriques, paillasse, carnet,
substances, matériel, lois) ; catalogue unique ; lois = modules composables interchangeables à cases
à cocher ; notices obligatoires ; prompt d'extension non-dev (`add-element.bat`) ; carnet v1
(notes + instantanés + restauration) ; portail 3 boutons ; contrainte prof actée (guide FR
`CREER-UN-LABO.md`) ; serveur MCP dev + config `.kiro/settings/mcp.json`.
Encore ouvertes :
1. **A ou B** : phase 1 réalisée = A (restructuration, démos conservées). B (+ éco en équations
   Lotka-Volterra) reste possible en phase 2 ?
2. **Bloc `guide` pédagogique** : maintenant ou plus tard ? (vision terrain+tableau validée)
3. **JSON avec commentaires** (JSONC) : oui ou JSON strict ?
4. **Boutons de scénarios** : dans le scope ?
5. **Portail : DÉCIDÉ et FAIT** — page d'accueil `index.html`, 3 boutons (Kit → GitHub, SpaceLab et EcoLab →
   versions autonomes `dist/`), nom AuraLab. Prévu : GitHub Pages comme lien démo vivant.
6. **Contrainte prof : ACTÉE** — toute création/adaptation de labo doit être faisable par un prof non-dev :
   config simple + guide FR + exemples commentés + erreurs en clair. Le guide arrive avec le schéma phase 1
   (pas de doc avant le schéma final).

## Journal — session 2026-11-07 (résumé complet)

1. **Repo** : création de AuraLab sur GitHub (public, GaiaSG94), cloné en local.
2. **Cadrage Kiroween** (règlement vérifié) : template épuré + 2 applis distinctes ; projet nouveau
   (30 oct.–4 déc. 2026) ; construit avec Kiro. Confirmé : le track veut un template, pas un SDK.
3. **Idée** : kit de labos visuels — Aura-Space (gravité/orbites) + Aura-Eco (proies/prédateurs),
   dashboard sombre soigné pour le critère Design.
4. **Kiro sans crédits** : specs/steering/hooks au build-time, exécution 100 % hors-ligne. Inquiétude levée.
5. **Scaffolding** : `core/` (validate.js, sim.js, app.js, styles.css), `app-space/`, `app-eco/`, `.kiro/`
   (requirements EARS, design, tasks, steering, hooks), scripts de validation, README, start-lab.bat.
6. **Accès** : `ERR_CONNECTION_REFUSED` répétés côté utilisateur (serveur non lancé, puis chemin collé dans
   la recherche Google). Réponse : pages autonomes `dist/*.html` + `build-standalone.mjs`. Trouvé et corrigé
   un bug d'un caractère (`/` manquant dans un regex → page blanche, invisible à `node --check`). Vérifié :
   exécution des octets exacts, captures Chrome headless relues, ouverture visible — Aura-Eco à 145 fps.
7. **Définition du labo** : boucle d'apprentissage ; composantes (phénomène, leviers peu nombreux, instruments,
   contrôle du temps, échec gratuit, cadrage pédagogique — ce dernier manquant, c'est ce qui sépare labo et jouet).
8. **Objection centrale (utilisateur)** : le socle actuel est un kit à particules déguisé (`sim.js` impose le
   modèle essaim). Mécanismes génériques mais vocabulaire fuyant (`wells`/`orbit`/`starfield`, `predates`/`eaten`),
   pas de répulsion, `mass` inutilisée. D'où la proposition coquille/moteurs + options A/B.
9. **Vision alignée** : terrain + tableau noir (voir ci-dessus).
