# F012 — Consommer l’URL backend dans le Service Worker

## Objectif

Faire de `backend.api_base_url` dans `config/runtime-contract.json` l’unique source de vérité permettant au Service Worker construit d’identifier les requêtes adressées au backend Julvox.

## Problème traité

Le frontend et les resource hints consomment déjà l’URL backend du contrat runtime. En revanche, le fichier source `sw.js` reconnaît encore l’API à partir de fragments historiques liés à Railway et à DealScan.

Lors d’un changement d’hébergeur ou de domaine, l’application pourrait appeler correctement le nouveau backend tandis que le Service Worker lui appliquerait une politique réseau incorrecte.

## Transformation de build

Le fichier source conserve l’ancre historique afin que toute évolution soit explicite et vérifiable. Pendant le build, `dist/sw.js` est transformé pour :

- dériver l’origine backend depuis `backend.api_base_url` ;
- comparer `url.origin` avec cette origine exacte ;
- conserver la stratégie `networkFirst` existante ;
- ajouter le marqueur `runtime-contract:backend.api_base_url`.

## Vérification

`scripts/verify-service-worker-backend-contract-consumption.js` contrôle que :

- l’ancre historique reste présente exactement une fois dans la source ;
- elle disparaît de la sortie construite ;
- l’origine configurée apparaît exactement une fois dans `dist/sw.js` ;
- la comparaison d’origine est utilisée ;
- les fragments historiques `railway.app` et `julvox-dealscan` ne gouvernent plus la détection dans la sortie construite.

## Hors périmètre

F012 ne modifie pas :

- l’URL backend actuelle ;
- les endpoints de l’API ;
- la stratégie `networkFirst` ;
- le TTL de 60 secondes ;
- les règles de cache des polices, navigations et assets ;
- les noms historiques des caches.

## Risque

Le build dépend d’une ancre historique supplémentaire dans `sw.js`. Toute modification future de cette zone devra être accompagnée d’une migration explicite du transformateur et du vérificateur.
