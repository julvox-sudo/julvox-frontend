# F000 — Audit et cartographie du frontend

## Statut

Document de travail du sprint F000. Cette étape ne modifie aucun comportement utilisateur.

## Objectif

Établir une base factuelle avant toute modularisation du frontend historique afin d'éviter les régressions et les décisions prématurées.

## État actuel observé

- Le frontend est une application statique construite par `build-static.js`.
- Le build copie les fichiers du dépôt vers `dist/` en excluant notamment `.git`, `.github`, `node_modules` et `package-lock.json`.
- La commande de build officielle est `npm run build`.
- `index.html` concentre encore une part importante de l'application et doit être traité comme un composant critique.
- `sw.js` porte des responsabilités sensibles : cache, mode hors ligne, notifications push et synchronisation.
- `enhancements_v3.js` dépend de variables globales et manipule directement le DOM.
- La baseline CI vérifie désormais le build et la présence de `dist/index.html` et `dist/sw.js`.

## Classification initiale des risques

### Critique

- démarrage et initialisation de l'application ;
- configuration et appels API ;
- enregistrement du service worker ;
- cache et stratégie hors ligne ;
- notifications push ;
- variables globales partagées ;
- modifications structurelles de `index.html`.

### À encadrer par des tests

- extraction progressive de fonctions depuis `index.html` ;
- modularisation de `enhancements_v3.js` ;
- timers et tâches différées ;
- injection dynamique de contenu dans le DOM ;
- stockage local et migration des clés existantes.

### Faible risque

- documentation ;
- automatisation de validations statiques ;
- inventaire des fonctionnalités ;
- clarification de la configuration de build ;
- ajout de contrôles sans modification du runtime.

## Règles de modification

1. Aucun changement de comportement implicite.
2. Une responsabilité extraite à la fois.
3. Toute extraction doit conserver les contrats globaux existants jusqu'à leur remplacement validé.
4. Le service worker ne sera modifié qu'avec une stratégie explicite de versionnement et de retour arrière.
5. Toute modification applicative passe par une pull request dédiée et une validation du build.
6. Aucune API future du Brain ne sera inventée par le frontend.

## Ordre de travail proposé

1. compléter l'inventaire des points d'entrée et dépendances ;
2. ajouter des validations statiques sans toucher au runtime ;
3. centraliser la configuration non fonctionnelle ;
4. sécuriser l'enregistrement du service worker ;
5. extraire progressivement les responsabilités à faible couplage ;
6. introduire des tests de fumée sur les parcours essentiels ;
7. préparer les futurs composants Julvox sans anticiper le contrat du Brain.

## Critères de sortie de F000

- build automatisé et reproductible ;
- fichiers critiques identifiés ;
- risques documentés ;
- séquence de modularisation définie ;
- aucune régression fonctionnelle introduite ;
- prochaine modification applicative suffisamment petite pour être validée indépendamment.
