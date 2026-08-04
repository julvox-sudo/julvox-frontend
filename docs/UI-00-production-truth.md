# UI-00 — Vérité produit et contrat des capacités frontend

## Référence

- dépôt : `julvox-sudo/julvox-frontend` ;
- branche de départ : `main` ;
- SHA de départ : `c4885c8dfcd1b77365a4899cc39c413ef2eff32a` ;
- branche : `fix/ui-00-production-truth`.

## Décision

UI-00 remplace fonctionnellement la proposition F015 sans fusion ni cherry-pick global de la PR #20.

Le modèle booléen de F015 n’est pas retenu, car une valeur `true` ne distingue pas une capacité totalement prise en charge d’une capacité partielle, expérimentale, indisponible ou réservée à une démonstration explicite.

Les mécanismes utiles repris manuellement sont :

- validation stricte du contrat ;
- exposition dans la configuration runtime ;
- correspondance exacte entre contrat source et sortie construite ;
- gel récursif de la configuration générée ;
- échec du build en cas de valeur inconnue.

Aucun commit de F015 n’a été cherry-pické.

## Statuts

Les seuls statuts admis sont :

- `supported` ;
- `partial` ;
- `experimental` ;
- `unavailable` ;
- `demo-only`.

Le mode `demo-only` est inaccessible lorsque `runtime.environment` vaut `production`.

## Vérité des données

Le build de production neutralise les générateurs de comparaison, wishlist, communauté, classement, rapports, scanner, historique et analyse locale de démonstration. Une panne réseau ne sélectionne jamais un mode de démonstration.

Les scores marchands locaux, durées de vérification aléatoires, votes aléatoires et compteurs flash synthétiques ne sont plus admis comme faits affichables en production.

## Vérité des mutations

Les mutations ciblées ne confirment leur succès qu’après :

1. une réponse HTTP attendue ;
2. un corps JSON valide lorsqu’il est requis ;
3. une confirmation métier minimale.

Les erreurs conservent le formulaire ou l’élément pour permettre une nouvelle tentative. La suppression de compte ne déconnecte plus l’utilisateur lorsque le backend échoue.

## Client API

`api-client.js` :

- lit uniquement `JULVOX_RUNTIME_CONFIG.backend.apiBaseUrl` ;
- ne contient aucune URL Railway ;
- conserve le statut HTTP et `Retry-After` ;
- distingue `success`, `empty`, `http-error`, `network-error` et `parse-error` ;
- n’expose pas les détails internes du serveur.

Stripe, PayPal, les droits Premium, les JWT et les contrats backend ne sont pas modifiés.

## Backend

Le backend a uniquement été consulté en lecture. Aucun fichier, branche, commit, PR, issue, workflow, endpoint, contrat ou réglage Railway backend n’appartient à UI-00.
