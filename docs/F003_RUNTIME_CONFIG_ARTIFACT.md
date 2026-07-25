# F003 — Artefact de configuration du runtime

## Objectif

Produire un artefact JavaScript déterministe depuis le contrat validé en F002, sans encore modifier le démarrage historique de l'application.

## Changements

- `config/runtime-contract.json` reste l'unique source déclarative ;
- `scripts/generate-runtime-config.js` génère `runtime-config.js` ;
- l'artefact expose une propriété globale non réassignable `JULVOX_RUNTIME_CONFIG` ;
- `scripts/verify-generated-runtime-config.js` exécute l'artefact dans un contexte isolé et vérifie son égalité avec le contrat ;
- la chaîne de build régénère et valide l'artefact avant la copie vers `dist/`.

## Limite volontaire

`index.html`, `enhancements_v3.js` et `sw.js` ne consomment pas encore cet artefact. Le comportement utilisateur et les appels backend restent donc strictement identiques.

Cette séparation est volontaire : elle permet de valider d'abord la production de la configuration avant de remplacer une première constante historique dans une PR distincte et réversible.

## Risque

Faible. Un nouveau fichier statique est produit et copié dans le build, mais il n'est pas chargé par le navigateur.

## Validation

- génération déterministe ;
- exécution sans erreur dans un contexte JavaScript isolé ;
- correspondance exacte avec le contrat F002 ;
- build statique complet ;
- aucune modification des fichiers applicatifs historiques.
