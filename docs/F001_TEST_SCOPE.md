# F001 — Périmètre du test de caractérisation

Le script `scripts/verify-runtime-entrypoints.js` ne teste pas la qualité fonctionnelle du produit. Il verrouille uniquement des contrats historiques dont dépendent actuellement les scripts :

- chargement de `enhancements_v3.js` ;
- présence de l’enregistrement du service worker ;
- présence de la configuration globale `API` ;
- présence de `renderDeals` ;
- initialisation de `enhancements_v3.js` depuis `DOMContentLoaded` ;
- extension de `CAT_IMG` et `STORE_TRUST` ;
- enveloppement de `window.renderDeals` ;
- présence des sept points d’entrée événementiels du service worker.

Une modification future de l’un de ces contrats devra être volontaire, isolée et accompagnée d’un remplacement testé. Le contrôle ne doit pas être supprimé uniquement pour faire passer une extraction.
