# INTENT — Vision du projet LabKit

> Document d'intention : ce que le projet veut devenir.
> Cible : hackathon Kiroween 2026, track Skeleton Crew (template épuré + deux applis distinctes).
> État actuel : socle + 4 labos fonctionnels (2 en 2D sur le shell, 2 en 3D sur interface propre) ;
> toutes les technologies Kiro intégrées et vérifiées en CI (voir Journal).

## Vision produit

LabKit est un **kit pour créer des labos éducatifs virtuels** : des espaces interactifs où l'on manipule des
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

Volonté explicite : le projet utilise l'ensemble des technologies de kiro.dev
comme méthode et infrastructure de conception, de façon visible et vérifiable
par les juges :

- **Spec-Driven Development** : specs EARS (`requirements.md`), `design.md`,
  `tasks.md` dans `.kiro/specs/` pour le kit et pour l'intégration.
- **Steering** : les 3 fichiers foundation (`product.md`, `tech.md`,
  `structure.md`) avec `inclusion: always` + architecture, design system
  (`fileMatch`), procédure (`manual`) et notices (`auto`).
- **Agent Hooks** : 6 triggers (`PostFileSave`, `FileCreate`, `PreToolUse`,
  `SessionStart`, `PostTaskExecution`, `Stop`), tous câblés à des commandes
  déterministes gratuites. Le hook `guard-ship` bloque réellement les commits
  et pushs sales (exit 2).
- **MCP** : serveur local `mcp-server/` (`labkit`, zéro dépendance) exposant
  5 outils : `list_catalog`, `list_labs`, `validate_lab`, `headless_check`,
  `scaffold_law`. Piloté en CI via `smoke-test.mjs`.
- **Custom agents** : 4 rôles dans `.kiro/agents/` (`lab-architect`,
  `law-smith`, `config-doctor`, `lab-reviewer`) avec outils étroits,
  permissions par capability et ressources explicites.
- **Agent Skills** : 3 compétences dans `.kiro/skills/` (`create-lab`,
  `add-law`, `package-standalone`) au standard Agent Skills.
- **Workflows** : 3 recettes dans `.kiro/workflows/` (`new-lab`,
  `fix-until-green`, `audit-labs`), testées par un validateur local en CI.
- **Power** : package `power-labkit/` au format Agent Plugins (`plugin.json` +
  MCP + skills), installable depuis GitHub.
- **Correctness (PBT)** : harnais de tests à base de propriétés (RNG semé,
  réduction gloutonne, zéro dépendance), 21 propriétés extraites directement
  des exigences EARS.
- **Permissions** : modèle de règles pour le fichier workspace par utilisateur
  + script d'installation.
- **.kiroignore et AGENTS.md** : protègent le contexte et fixent le contrat
  pour tout agent.

Contrainte assumée (crédits incertains) : Kiro intervient au **build-time,
jamais au runtime**. Les labos tournent sans crédits, sans clés API, sans
backend. D'éventuels crédits serviraient à concevoir plus vite, pas à faire
tourner le produit.

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
(notes + instantanés + restauration) ; portail ; contrainte prof actée (guide FR
`CREER-UN-LABO.md`) ; serveur MCP dev + config `.kiro/settings/mcp.json` ;
**toutes les technologies Kiro intégrées et vérifiées en CI** (specs, steering,
hooks, MCP, agents, skills, workflows, power, permissions, .kiroignore,
AGENTS.md, PBT) ; **tests à base de propriétés** sur les exigences EARS.
Encore ouvertes :
1. **A ou B** : phase 1 réalisée = A (restructuration, démos conservées). B (+ éco en équations
   Lotka-Volterra) reste possible en phase 2 ?
2. **Bloc `guide` pédagogique** : maintenant ou plus tard ? (vision terrain+tableau validée)
3. **JSON avec commentaires** (JSONC) : oui ou JSON strict ?
4. **Boutons de scénarios** : dans le scope ?
5. **Portail : DÉCIDÉ et FAIT** — page d'accueil `index.html` avec les 4 labos.
   Prévu : GitHub Pages comme lien démo vivant.
6. **Contrainte prof : ACTÉE** — toute création/adaptation de labo doit être faisable par un prof non-dev :
   config simple + guide FR + exemples commentés + erreurs en clair.
7. **Vidéo de démo** : reste à tourner (task 13 de la spec `kiro-integration`,
   task 10 de la spec `visual-lab`).

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

## Journal — session 2026-11-11 (intégration Kiro complète)

Objectif : que **toutes** les technologies kiro.dev soient intégrées et
vérifiables, pas seulement mentionnées.

1. **Audit** : specs présentes mais figées sur 2 labos (il y en a 4) ;
   steering sans fichiers foundation ni modes d'inclusion ; 1 seul hook ;
   MCP à 3 outils ; **aucun** agent custom, skill, workflow, power,
   `.kiroignore`, `AGENTS.md` ; aucun test malgré la task 2 qui promettait
   « 600 steps headless, no NaN ».
2. **Correctness / PBT** : harnais maison (`tests/harness.mjs`, RNG semé +
   réduction gloutonne, zéro dépendance) et 21 propriétés nommées d'après
   leur `REQ`. Les propriétés sont écrites comme des **implications** : sans
   cela, la réduction détruit la prémisse et produit un faux contre-exemple
   (constaté sur REQ-04 et REQ-10).
3. **Bug produit trouvé par les tests** : l'erreur `params.pairs` ne nommait
   pas la substance inconnue, contrairement à REQ-04. Corrigé dans
   `core/validate.js` — la propriété a guidé le fix, pas l'inverse.
4. **`app-ponts/lab.js` créé** : le labo 3D n'avait que `game.js` (DOM). Sans
   câblage DOM-free, il était invisible au validateur, au serveur MCP et aux
   tests. Les 4 labos se simulent désormais headlessly.
5. **Hooks** : 6 triggers, tous en commandes déterministes (jamais d'action
   `agent` : gratuit, rapide, reproductible). Le hook qui compte est
   `guard-ship` (PreToolUse) : il **bloque** `git commit/push/merge/rebase`
   tant qu'un config est invalide, qu'une propriété échoue ou que `dist/`
   dérive. Exit 2 = appel d'outil refusé.
6. **MCP** : serveur renommé `labkit`, scindé (`catalog.mjs` / `tools.mjs` /
   `index.js`), 5 outils dont `list_labs` et `headless_check` ; probe stdio
   `smoke-test.mjs` joué en CI.
7. **Agents / Skills / Workflows / Power** : 4 agents à périmètre étroit
   (`lab-reviewer` n'a aucune capability d'écriture), 3 skills, 3 recettes de
   workflow (séquence, revue en parallèle, boucle bornée avec `fileCheck`),
   et un power au format Agent Plugins.
8. **Garde-fous locaux** : `scripts/check-kiro.mjs` valide chaque artefact
   Kiro (front matter, triggers, schéma d'agent, manifeste de power) et
   `scripts/validate-workflows.mjs` rejoue les contraintes du `validate_workflow`
   de Kiro — les deux tournent en CI, donc un artefact cassé ne peut plus
   disparaître silencieusement.
9. **Permissions** : Kiro les stocke par utilisateur, hors du dépôt. Le dépôt
   livre donc un modèle + un installeur, et les règles par capability vivent
   dans les profils d'agents (le seul scope qui voyage avec le repo).
10. **CI** : 5 jobs (fmt, lint, build, test, pbt) + le garde-fou budget ;
    déclenchement étendu aux push sur `main`.
