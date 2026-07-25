# F011 — Consommer le backend dans les resource hints

## Objectif

Faire de `config/runtime-contract.json > backend.api_base_url` l’unique source de vérité du domaine backend utilisé par les optimisations réseau du document construit.

## Problème traité

Le frontend consommait déjà `backend.api_base_url` pour les appels applicatifs, mais `dns-prefetch` et `preconnect` restaient liés en dur au domaine Railway historique dans `index.html`.

Un changement d’hébergement pouvait donc mettre à jour les appels API sans mettre à jour les resource hints, créant une optimisation inutile vers l’ancien domaine et aucune anticipation de connexion vers le nouveau.

## Comportement du build

Le build conserve les valeurs historiques dans le fichier source comme ancres de migration explicites, puis génère dans `dist/index.html` :

- un `dns-prefetch` vers `backend.api_base_url` ;
- un `preconnect` vers `backend.api_base_url` ;
- un marqueur `runtime-contract:backend.api_base_url` pour la traçabilité.

Le build échoue si les ancres historiques disparaissent ou se multiplient sans migration explicite.

## Vérification

`scripts/verify-backend-resource-hints-contract-consumption.js` contrôle que :

- l’URL contractuelle est une URL HTTPS absolue ;
- les ancres historiques restent présentes dans la source ;
- la sortie construite contient exactement un `dns-prefetch` et un `preconnect` vers la valeur contractuelle ;
- le marqueur de traçabilité est présent.

## Hors périmètre

- modification de l’URL backend ;
- ajout ou suppression d’endpoints ;
- stratégie de retry ou de cache réseau ;
- modification des resource hints Google Fonts ;
- changement du comportement runtime des appels API.