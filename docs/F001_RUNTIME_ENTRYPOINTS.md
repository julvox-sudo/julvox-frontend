# F001 — Inventaire des points d’entrée et dépendances du runtime

## Statut

Document d’inventaire uniquement. Cette étape ne modifie aucun comportement utilisateur ni aucun contrat avec le backend.

## Objectif

Décrire le démarrage réel du frontend historique avant toute extraction de code. L’objectif est de rendre visibles les dépendances implicites, l’ordre d’exécution et les zones où une modification isolée pourrait provoquer une régression.

## Chaîne de démarrage observée

1. Le navigateur charge `index.html`.
2. Le document fournit directement une grande partie du CSS, du HTML et du JavaScript applicatif.
3. Le manifeste PWA est chargé depuis `/manifest.json`.
4. Les fonctions et états du script principal sont créés dans la portée globale du navigateur.
5. Les traitements d’initialisation du document déclenchent le chargement des deals, la restauration de l’état local, les écouteurs DOM et l’enregistrement du service worker.
6. `enhancements_v3.js` s’exécute après le script principal et attend encore 500 ms après `DOMContentLoaded` avant d’activer ses extensions.
7. Le service worker `sw.js` fonctionne dans une portée séparée et intercepte les requêtes réseau, les notifications, les messages et la synchronisation.

## Points d’entrée principaux

### `index.html`

Responsabilités actuellement réunies dans un seul fichier critique :

- structure HTML de toutes les vues et modales ;
- styles globaux et styles de composants ;
- configuration de l’URL API ;
- état global de navigation, recherche, tri, catégories et utilisateur ;
- chargement, transformation et rendu des deals ;
- authentification et compte utilisateur ;
- favoris, alertes, votes, commentaires et stockage local ;
- pages secondaires, analyse de prix, promotions, parrainage, communauté et swipe ;
- gestion PWA et communication avec le service worker ;
- nombreux gestionnaires appelés directement depuis des attributs HTML `onclick`.

Conséquence : les fonctions déclarées doivent rester disponibles globalement tant que les attributs HTML et les scripts additionnels les appellent directement.

### `enhancements_v3.js`

Ce fichier n’est pas autonome. Il dépend de symboles créés auparavant par `index.html`, notamment :

- `API` ;
- `CAT_IMG` ;
- `STORE_TRUST` ;
- `escHtml` ;
- `renderDeals` ;
- les éléments DOM tels que `flashRow`, `statDeals` et les conteneurs de filtres.

Il modifie aussi le runtime existant :

- extension de `CAT_IMG` et `STORE_TRUST` avec `Object.assign` ;
- appels directs à l’API ;
- création dynamique de DOM et de CSS ;
- création de plusieurs `setInterval` ;
- remplacement de `window.renderDeals` par une fonction enveloppe ;
- attente artificielle de 500 ms, puis tentatives répétées pour trouver `window.renderDeals`.

Conséquence : son ordre de chargement par rapport au script principal est un contrat implicite. Le déplacer ou le convertir isolément en module casserait l’accès aux variables globales.

### `sw.js`

Le service worker possède ses propres points d’entrée événementiels :

- `install` : préchargement du manifeste et des polices, puis `skipWaiting` ;
- `activate` : suppression des anciens caches et prise de contrôle des clients ;
- `fetch` : stratégie réseau/cache selon le type de ressource ;
- `push` : construction des notifications ;
- `notificationclick` : navigation, actions et rappel différé best-effort ;
- `sync` : reprise des votes et emplacement réservé aux alertes ;
- `message` : prise en charge de `SKIP_WAITING`.

Le service worker est versionné avec `CACHE_VERSION = 'v17'`. Toute modification future devra inclure une décision explicite sur la version de cache, la compatibilité hors ligne et le retour arrière.

### `build-static.js`

Le build ne transforme pas le code. Il copie le dépôt dans `dist/` en excluant notamment :

- `dist` ;
- `.git` ;
- `.github` ;
- `node_modules` ;
- `package-lock.json`.

Conséquence : l’ordre des scripts et les variables globales observés dans les sources sont conservés tels quels en production.

## Dépendances externes observées

- backend Railway via la constante globale `API` ;
- Google Fonts ;
- images distantes, notamment Unsplash et les images marchands ;
- APIs navigateur : Fetch, Cache Storage, Service Worker, Notifications, Push, Background Sync, Local Storage, Mutation Observer et Media APIs selon les fonctionnalités ;
- domaines `julvox.com` utilisés pour les liens, notifications et retours vers l’application.

## États globaux à préserver

L’inventaire montre plusieurs familles d’état partagées entre fonctions :

- utilisateur courant et jeton d’authentification ;
- collection complète des deals et filtres courants ;
- catégorie, tri et score minimal ;
- favoris et données restaurées depuis `localStorage` ;
- caches applicatifs et timers ;
- tables globales d’images, catégories et confiance marchands ;
- fonctions exposées sur `window` ou accessibles depuis les attributs HTML.

Ces états ne doivent pas être déplacés ou renommés sans une couche de compatibilité testée.

## Couplages critiques identifiés

1. `index.html` concentre présentation, état et logique métier d’interface.
2. Les attributs `onclick` imposent une disponibilité globale des fonctions.
3. `enhancements_v3.js` lit et modifie des variables du script principal.
4. Le monkeypatch de `window.renderDeals` dépend du moment exact où la fonction devient disponible.
5. Plusieurs initialisations reposent sur `DOMContentLoaded`, `setTimeout` et `setInterval` plutôt que sur un orchestrateur unique.
6. Les appels API sont répartis dans de nombreuses fonctions et dépendent d’une constante globale.
7. Le service worker applique des stratégies réseau pouvant masquer ou amplifier une régression de frontend.
8. Le build statique ne fournit aucune isolation entre les scripts.

## Frontières candidates pour les prochaines étapes

Ces frontières sont des candidats d’étude, pas encore des autorisations d’extraction :

1. configuration non fonctionnelle et constantes stables ;
2. utilitaires purs sans accès au DOM ni aux globals ;
3. registre centralisé des timers ;
4. couche d’accès API conservant strictement les endpoints actuels ;
5. enregistrement du service worker isolé derrière une fonction compatible ;
6. rendu de petits composants sans état partagé.

## Ordre de sécurisation recommandé

1. ajouter un contrôle automatique de l’ordre et de la présence des scripts ;
2. inventorier les globals réellement consommés entre fichiers ;
3. identifier une première fonction pure sans effet de bord ;
4. écrire un test de caractérisation avant son extraction ;
5. extraire une seule responsabilité ;
6. vérifier build, CI et comportement visuel avant toute étape suivante.

## Ce que F001 ne fait pas

- aucun changement d’endpoint ;
- aucune création d’API future du Brain ;
- aucune conversion en framework ;
- aucune conversion immédiate vers les modules ES ;
- aucun renommage de fonction globale ;
- aucune modification de `sw.js` ;
- aucune suppression de timer, fallback ou donnée locale.

## Critères de sortie de F001

- points d’entrée documentés ;
- dépendances inter-fichiers explicites ;
- globals et effets de bord classés comme zones à préserver ;
- ordre de chargement reconnu comme contrat temporaire ;
- prochaine modification suffisamment petite pour recevoir un test de caractérisation dédié ;
- build et CI toujours verts sans changement fonctionnel.
