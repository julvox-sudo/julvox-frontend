# F012 — Consommer l’URL backend dans le Service Worker

## Objectif

Faire de `backend.api_base_url` dans `config/runtime-contract.json` l’unique source de vérité permettant au Service Worker construit d’identifier les requêtes adressées au backend Julvox.

## Cause racine corrigée

L’ancien vérificateur exigeait exactement une occurrence de la détection historique :

```js
url.hostname.includes('railway.app') || url.hostname.includes('julvox-dealscan')
```

UI-00 avait déjà remplacé ce comportement par une comparaison d’origine exacte, mais la source `sw.js` conservait encore une URL Railway complète afin que `build-static.js` puisse la remplacer. Le vérificateur et la source exprimaient donc deux générations différentes du contrat.

Cette chaîne historique n’a plus de fonction runtime utile. La décision retenue est l’Option B : remplacer l’ancien invariant par une ancre de build neutre et vérifiable.

## Ancre source

La source `sw.js` contient exactement une occurrence de :

```js
const BACKEND_ORIGIN = '__JULVOX_BACKEND_ORIGIN_FROM_RUNTIME_CONTRACT__'; /* build-anchor:service-worker-backend-origin */
```

Cette ancre :

- ne contient aucun nom d’hébergeur ;
- n’est pas une URL de secours ;
- n’est jamais livrée dans `dist/sw.js` ;
- doit être présente exactement une fois ;
- provoque un échec fermé si elle disparaît ou est dupliquée.

## Transformation de build

`build-static.js` :

1. lit `backend.api_base_url` dans `config/runtime-contract.json` ;
2. valide une URL HTTP(S) sans identifiants, requête ni fragment ;
3. en dérive l’origine avec `new URL(...).origin` ;
4. remplace exactement une fois l’ancre neutre ;
5. génère dans `dist/sw.js` :

```js
const BACKEND_ORIGIN = '<origine du contrat>'; /* runtime-contract:backend.api_base_url */
```

La détection runtime reste :

```js
if (url.origin === BACKEND_ORIGIN) {
```

Aucune seconde source de vérité backend n’est créée.

## Vérification source et artefact

`scripts/verify-service-worker-backend-contract-consumption.js` contrôle que :

- la source contient exactement une ancre neutre ;
- la source ne contient ni URL Railway, ni fragment `julvox-dealscan`, ni `api_base_url`, ni origine backend HTTP codée en dur ;
- la sortie ne contient plus l’ancre neutre ;
- la sortie contient exactement un marqueur `runtime-contract:backend.api_base_url` ;
- l’origine construite correspond exactement à celle du contrat ;
- `BACKEND_ORIGIN` est défini une seule fois ;
- la comparaison d’origine exacte est présente une seule fois ;
- aucun fallback `||` ou `??` n’est associé à `BACKEND_ORIGIN` ;
- les fragments historiques de nom d’hôte ne réapparaissent pas.

Les tests adversariaux refusent également une origine différente, la suppression du marqueur et un fallback implicite.

## Comportement offline conservé

Cette correction ne modifie pas les politiques réseau et cache :

- seules les requêtes GET publiques, non authentifiées et explicitement autorisées peuvent être mises en cache ;
- les mutations et requêtes authentifiées restent réseau uniquement ;
- une panne sans réponse utilisable produit `503` ;
- un cache expiré ou invérifiable produit `504` ;
- aucune panne API n’est transformée en succès métier vide ;
- aucun deal ou résultat n’est fabriqué.

## Artefact public

La correction n’ajoute aucun fichier public. L’artefact QUALITY-01A reste contractuellement limité à exactement 17 fichiers.

## Hors périmètre

F012 ne modifie pas :

- la valeur actuelle de l’URL backend ;
- les endpoints de l’API ;
- les règles fonctionnelles de cache ;
- le TTL public ;
- les noms historiques des caches ;
- le backend ou Railway.
