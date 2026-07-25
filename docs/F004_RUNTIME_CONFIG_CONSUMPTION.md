# F004 — Première consommation de la configuration runtime

## Objectif

Faire consommer au frontend construit l’artefact `runtime-config.js` validé en F003, avec un changement limité à la sélection de l’URL backend.

## Changement appliqué

Le build statique transforme uniquement `dist/index.html` :

1. il charge `/runtime-config.js` avant l’initialisation du script historique ;
2. il initialise `API` depuis `window.JULVOX_RUNTIME_CONFIG.backend.api_base_url` ;
3. il conserve l’URL historique comme fallback strict.

Le fichier source `index.html` reste inchangé pendant cette étape afin de rendre le retour arrière immédiat : retirer la transformation de `build-static.js` restaure exactement le build précédent.

## Contrats préservés

- le nom global `API` reste identique ;
- tous les appels réseau existants continuent d’utiliser `API` ;
- l’URL effective reste la même que celle utilisée avant F004 ;
- aucun endpoint, payload ou comportement du Brain n’est inventé ;
- `enhancements_v3.js` continue de dépendre du même global `API`.

## Vérification automatique

`scripts/verify-runtime-config-consumption.js` vérifie que :

- `dist/runtime-config.js` existe ;
- `dist/index.html` charge l’artefact avant l’initialisation de `API` ;
- `API` lit bien `JULVOX_RUNTIME_CONFIG` ;
- la déclaration historique autonome n’est plus présente dans le build ;
- le fallback historique reste explicitement disponible.

## Risque

Faible mais réel : il s’agit de la première modification du runtime construit. La PR reste donc en brouillon jusqu’à validation visuelle complète de la CI.

## Hors périmètre

- modification de `sw.js` ;
- changement de l’URL backend ;
- migration des autres valeurs PWA ;
- modularisation de fonctions depuis `index.html` ;
- modification des contrats d’API du Brain.
