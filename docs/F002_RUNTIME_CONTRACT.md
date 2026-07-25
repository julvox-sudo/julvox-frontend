# F002 — Contrat de configuration du runtime

## Objectif

Formaliser les valeurs de configuration déjà utilisées par le frontend historique avant de les extraire du monolithe `index.html`.

Cette étape ne modifie pas le comportement de l'application. Elle crée une source de vérité vérifiable qui empêchera une future extraction de changer silencieusement une URL, un chemin PWA ou une version de cache.

## Valeurs verrouillées

- URL de base du backend Railway ;
- chemin de santé `/health` ;
- chemin du manifeste PWA ;
- chemin du service worker ;
- version du cache du service worker ;
- nom du script `enhancements_v3.js`.

## Fichiers

- `config/runtime-contract.json` contient le contrat déclaratif ;
- `scripts/verify-runtime-contract.js` compare le contrat au runtime actuel ;
- `npm run verify:contract` exécute la vérification ;
- `npm run build` échoue si une valeur dérive sans mise à jour explicite du contrat.

## Limite volontaire

Le runtime lit encore ses valeurs historiques directement depuis `index.html` et `sw.js`. La centralisation exécutable viendra dans une pull request distincte, plus petite et réversible, après validation de ce contrat.

## Critère de validation

- aucune modification de `index.html`, `sw.js` ou `enhancements_v3.js` ;
- build statique entièrement vert ;
- aucune fusion sans preuve visuelle des checks GitHub.
