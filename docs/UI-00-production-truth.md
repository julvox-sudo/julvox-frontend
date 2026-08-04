# UI-00 — Vérité produit et contrat des capacités frontend

## Reprise du 4 août 2026

L’ancienne conversation s’est bloquée après la fusion de `main` dans la branche UI-00, avant la finalisation fonctionnelle, les tests, la CI, Vercel et Julvox-book.

La reprise a commencé en lecture seule et a confirmé :

- `main` : `595826a2f0446e90ecb98de5ed3dd0ab914baad1` ;
- ancien head UI-00 : `75f5579e88e72e392c12a1c2a757a158c3516921` ;
- ordre réel : `282e1976…` puis `10700984…` puis merge `75f5579…` ;
- branche à zéro commit derrière `main` ;
- PR #23 ouverte, Draft et non fusionnée ;
- PR #20 et #21 inchangées, ouvertes et Draft.

Aucune nouvelle branche, aucun rebase, aucun force-push et aucun nouveau merge de `main` n’a été effectué.

## Décision

UI-00 remplace fonctionnellement la proposition F015 sans fusion ni cherry-pick global de la PR #20.

Le modèle booléen de F015 n’est pas retenu, car une valeur `true` ne distingue pas une capacité totalement prise en charge d’une capacité partielle, expérimentale, indisponible ou réservée à une démonstration explicite.

## Contrat des capacités

Les seuls statuts admis sont :

- `supported` ;
- `partial` ;
- `experimental` ;
- `unavailable` ;
- `demo-only`.

Une valeur inconnue échoue fermée comme `unavailable`. `demo-only` est inaccessible lorsque `runtime.environment` vaut `production` et n’est activable que dans un environnement explicitement `demo`.

La configuration générée est gelée récursivement et sa consommation est vérifiée dans le contrat source comme dans l’artefact construit.

## Cinq blocages corrigés

### 1. Wishlist de démonstration

Les deux chemins qui utilisaient `getDemoWishlist()` sont remplacés par une lecture backend via le client central.

En cas d’échec :

- aucun MacBook, PS5, produit Nike ou autre fixture n’est affiché ;
- les dernières données confirmées restent visibles lorsqu’elles existent ;
- un état indisponible et une nouvelle tentative sont proposés.

### 2. Historique simulé

`generateSimulatedHistory()` et la courbe synthétique initiale ne participent plus au build de production.

Sans historique backend suffisant, l’interface affiche « Historique indisponible » et ne calcule aucune tendance locale présentée comme réelle.

### 3. Votes aléatoires

Le fallback de `loadDealVotes()` ne fabrique plus de compteurs avec `Math.random()`.

En cas d’échec, les dernières valeurs confirmées sont conservées et la zone est qualifiée comme indisponible. Les votes optimistes ne sont validés qu’après compteurs serveur cohérents.

### 4. Scores arbitraires

Les replis `50`, `75` et `82`, les scores marchands statiques et l’analyse locale ne sont plus présentés comme vérité backend.

Lorsqu’un score manque, les vues concernées affichent « Score indisponible » ou masquent l’indicateur.

### 5. Appels backend directs

Les constructions `fetchWithTimeout(API + ...)`, les templates directs équivalents et les appels `fetch(API + ...)` concernés par UI-00 sont transformés vers `api-client.js`.

Aucun fallback Railway codé en dur n’existe dans le client ou dans la déclaration API de production.

## Client API

`api-client.js` :

- lit exclusivement `window.JULVOX_RUNTIME_CONFIG.backend.apiBaseUrl` ;
- refuse l’absence de configuration au lieu d’utiliser une URL de secours ;
- refuse une URL absolue située hors de l’origine et du préfixe backend configurés ;
- applique un timeout contrôlé ;
- transporte le bearer token uniquement lorsqu’il est fourni ;
- conserve le statut HTTP et `Retry-After` ;
- distingue `success`, `empty`, `http-error`, `network-error` et `parse-error` ;
- n’expose pas les détails internes du serveur ;
- exige une confirmation métier explicite lorsqu’une mutation fournit un prédicat `confirm`, y compris pour un corps vide ou un `204`.

## Vérité des mutations

Aucun succès métier n’est affiché avant une confirmation serveur valide.

Les chemins durcis couvrent notamment :

- création et suppression d’alerte ;
- ajout et retrait wishlist ;
- vote deal, vote communautaire et vote code promo ;
- soumission communautaire ;
- commentaire ;
- signalement ;
- création et jonction de squad ;
- newsletter ;
- notifications push ;
- suppression de compte.

Selon l’opération, la confirmation exige un identifiant, des compteurs cohérents, un statut métier explicitement autorisé, un booléen de suppression ou un `204` serveur.

En cas d’échec :

- rollback de l’état optimiste ;
- conservation du formulaire ou de l’état antérieur ;
- aucun identifiant, point, vote ou compteur fictif ;
- aucune suppression locale présentée comme serveur ;
- aucune déconnexion après suppression de compte non confirmée ;
- désabonnement navigateur si l’enregistrement push backend échoue.

## Service Worker

Les réponses d’indisponibilité sont qualifiées :

- `503` pour l’indisponibilité hors ligne ;
- `504` pour une réponse périmée ou non disponible dans le délai prévu.

Le Service Worker ne fabrique plus un tableau de deals vide comme réponse métier réussie.

## Artefact public

UI-00 adopte l’option B : `api-client.js` et `ui-00-production-truth.js` sont deux fichiers runtime publics supplémentaires.

QUALITY-01A évolue explicitement de 15 à 17 fichiers sans perdre :

- liste blanche ;
- validation indépendante ;
- arbre exact ;
- références publiques ;
- scan heuristique de secrets ;
- déterminisme ;
- inventaire machine-readable ;
- CI.

Aucun dix-huitième fichier n’est autorisé.

## Validation

Sur le head fonctionnel `1335d2520703b78f24f50fe0f5404fdbf38fac81` :

- 38 tests UI-00 réussis ;
- `npm run build` réussi ;
- tous les contrôles historiques, contractuels, UI-00 et QUALITY-01A réussis ;
- run GitHub Actions `30952187940` : `completed/success` ;
- déterminisme vérifié sur deux builds propres ;
- inventaire : 17 fichiers, 576 967 octets ;
- scan heuristique : 10 fichiers texte analysés, 7 binaires explicitement classifiés ;
- preview Vercel du même head : `READY` ;
- logs Vercel : build complet et déploiement réussi.

## Limites

- les actions GitHub émettent un avertissement non bloquant de dépréciation Node.js 20 ;
- la référence JSON-LD préexistante vers `https://julvox.com/logo.png` reste une anomalie hors périmètre connue ;
- une preview protégée par SSO ne doit pas être décrite comme smoke distant réussi ;
- UI-00 ne prouve pas la disponibilité fonctionnelle de routes backend absentes ou non auditées : l’interface doit alors afficher l’indisponibilité ;
- la PR #23 reste Draft, sans passage en Ready et sans fusion.

## Hors périmètre confirmé

Aucune modification n’a été apportée au backend, à Railway, aux routes backend, aux paiements, à Premium, au logo, au thème, au framework, à QUALITY-01B ou QUALITY-01C.
