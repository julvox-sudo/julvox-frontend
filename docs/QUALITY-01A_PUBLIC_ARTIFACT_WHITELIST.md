# QUALITY-01A — Liste blanche de l’artefact public

## Objectif

Garantir que `dist/` contient exactement les fichiers nécessaires au runtime public du frontend Julvox, et aucun fichier interne du dépôt.

## Évolution explicite UI-00

QUALITY-01A avait figé un artefact public de 15 fichiers. UI-00 adopte explicitement l’option B : les deux nouveaux composants runtime sont publics et contrôlés au même niveau que les quinze fichiers historiques.

Les deux seules additions autorisées sont :

- `api-client.js` ;
- `ui-00-production-truth.js`.

L’invariant devient donc :

> `dist/` contient exactement 17 fichiers explicitement autorisés, sans dix-huitième fichier.

Il ne s’agit ni d’un retour au build récursif historique, ni d’une exception non contrôlée. Le manifeste, la liste indépendante du vérificateur, la liste indépendante du workflow, les contrôles de références, l’inventaire et le déterminisme ont été modifiés ensemble.

## Liste blanche exacte

```text
api-client.js
enhancements_v3.js
google3a92a4041aeeec5e.html
icons/icon-192.png
icons/icon-512.png
icons/shortcut-alerts.png
icons/shortcut-deals.png
icons/shortcut-flash.png
icons/shortcut-promos.png
index.html
manifest.json
robots.txt
runtime-config.js
screenshots/screenshot-mobile.png
sitemap.xml
sw.js
ui-00-production-truth.js
```

Le manifeste de publication reste distinct de `config/runtime-contract.json` et n’est jamais copié dans `dist/`.

## Pourquoi la validation est indépendante

Le build copie uniquement les chemins déclarés dans `config/public-artifact-manifest.json`. Une seconde liste explicite, écrite dans `scripts/verify-public-manifest.js`, refuse toute évolution non approuvée. Le workflow GitHub contient une troisième liste indépendante et compare l’arbre produit avec `find` et `diff`.

Cette duplication est intentionnelle : un manifeste modifié ne peut pas produire puis valider tautologiquement un ensemble public élargi.

## Construction

Le build :

1. valide les 17 chemins triés ;
2. refuse les chemins absolus Unix et Windows, la traversée, les segments vides, les séparateurs Windows, les doublons et les collisions de casse ;
3. refuse tout chemin caché ou interne, y compris `.git/**`, `.github/**`, `build-reports/**`, `config/**`, `docs/**`, `scripts/**`, `tests/**` et leurs variantes de casse ;
4. inspecte chaque composant du chemin source et refuse les liens symboliques, y compris un répertoire parent symlinké ;
5. recrée `dist/` depuis zéro ;
6. copie uniquement les fichiers autorisés ;
7. applique les intégrations runtime et les transformations UI-00 déterministes ;
8. compare l’arbre produit à la liste blanche exacte et refuse aussi les répertoires inattendus ou vides ;
9. valide les références HTML, CSS, `srcset`, manifeste et Service Worker ;
10. génère un inventaire déterministe avec chemin, taille, SHA-256 et classification.

## Fichiers exclus

Restent notamment exclus :

- `.git/**` et `.github/**` ;
- `build-reports/**` ;
- `config/**` ;
- `docs/**` ;
- `scripts/**` ;
- `tests/**` ;
- `node_modules/**` ;
- les chemins cachés ;
- les fichiers Markdown, temporaires, sauvegardes et journaux ;
- `.env` et ses variantes ;
- `README.md`, `package.json`, `package-lock.json` et `build-static.js`.

Les fichiers restent versionnés dans le dépôt ; seule leur publication est interdite.

## Références publiques

Le contrôle inspecte le contenu réellement construit :

- attributs `src`, `href` et `poster` de `index.html` ;
- candidats de `srcset` et `imagesrcset` ;
- références `url(...)` et `@import` ;
- enregistrements du Service Worker ;
- icônes, raccourcis et screenshots de `manifest.json` ;
- ressources locales de `STATIC_ASSETS` et fallbacks `caches.match(...)` de `sw.js`.

Les URL externes, ancres, routes dynamiques, `mailto:`, `data:` et `/cdn-cgi/` sont classées séparément. Une référence locale littérale doit correspondre à un fichier public réel.

La référence JSON-LD préexistante vers `https://julvox.com/logo.png` reste inscrite comme anomalie hors périmètre. Aucun faux `logo.png` n’est créé.

## Scan heuristique de secrets

Tous les formats textuels autorisés sont lus. Les formats binaires sont ignorés uniquement lorsqu’ils appartiennent à une liste explicite ; une extension non classifiée fait échouer le contrôle.

Le scan recherche notamment :

- matériaux de clé privée PEM ;
- tokens GitHub ;
- clés d’accès AWS ;
- clés Stripe secrètes ;
- credentials intégrés dans une URL ;
- JWT littéraux ;
- affectations évidentes de mot de passe, `DATABASE_URL`, `PRIVATE_KEY`, `SECRET`, `API_KEY`, token d’accès, `CLIENT_SECRET` ou credentials.

Des fixtures construites à l’exécution prouvent que chaque détecteur minimal reste actif. Le scan reste heuristique : il réduit le risque sans garantir mathématiquement l’absence de toute information sensible.

## Rapports machine-readable

Le build produit hors de `dist/` :

- `build-reports/public-artifact-inventory.json` ;
- `build-reports/public-reference-report.json`.

L’inventaire ne contient aucune métadonnée variable. Il peut être comparé octet pour octet entre deux builds propres.

## Déterminisme

`npm run verify:public-determinism` :

1. dépose un marqueur obsolète avant chaque build ;
2. exécute deux fois la chaîne complète `npm run build` ;
3. vérifie que la reconstruction supprime le marqueur ;
4. compare les deux inventaires octet pour octet ;
5. compare les chemins, tailles, classifications et SHA-256.

## Validation prouvée

Sur le head fonctionnel `1335d2520703b78f24f50fe0f5404fdbf38fac81`, le run GitHub Actions `30952187940` a réussi :

- build complet ;
- 38 tests UI-00 ;
- manifeste indépendant de 17 fichiers ;
- artefact exact ;
- références publiques ;
- scan heuristique de secrets ;
- deux builds propres déterministes ;
- preuve indépendante du workflow ;
- upload de l’artefact et des rapports.

Inventaire observé pendant ce run : 17 fichiers, 576 967 octets.

## Limites connues

- `admin.html` et `offline.html` restent absents ;
- le fichier Google de validation est conservé par prudence ;
- les avertissements de dépréciation Node.js 20 émis par les actions GitHub sont non bloquants et hors UI-00 ;
- le smoke HTTP local doit porter sur l’artefact CI exact servi depuis une racine statique propre ;
- une protection SSO éventuelle de preview doit être documentée, jamais présentée comme un smoke distant réussi.
