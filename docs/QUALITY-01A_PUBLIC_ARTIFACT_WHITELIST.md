# QUALITY-01A — Liste blanche de l’artefact public

## Objectif

Garantir que `dist/` contient exactement les fichiers nécessaires au runtime public du frontend Julvox, et aucun fichier interne du dépôt.

## Point de départ

- dépôt : `julvox-sudo/julvox-frontend` ;
- branche de base : `main` ;
- SHA de départ : `c4885c8dfcd1b77365a4899cc39c413ef2eff32a` ;
- PR #20 et #21 : ouvertes, Draft et non fusionnées au démarrage ;
- inventaire reconstruit avant correction : 60 fichiers publics.

L’ancien `build-static.js` copiait récursivement toute la racine, sauf `dist`, `.git`, `.github`, `node_modules` et `package-lock.json`. Des fichiers internes étaient donc servis publiquement, notamment :

- `/README.md` ;
- `/build-static.js` ;
- `/config/runtime-contract.json` ;
- `/scripts/verify-source.js`.

Le total historique de 60 fichiers a été reconstruit depuis l’arbre Git et l’algorithme de build. L’exposition des quatre exemples ci-dessus a été confirmée par des requêtes HTTP sur la production antérieure à QUALITY-01A.

## Invariant

> `dist` doit contenir exactement les fichiers explicitement autorisés dans `config/public-artifact-manifest.json`, et aucun autre.

## Liste blanche

La liste blanche contient 15 fichiers :

- les cinq entrées runtime (`index.html`, `manifest.json`, `sw.js`, `runtime-config.js`, `enhancements_v3.js`) ;
- `robots.txt` et `sitemap.xml` ;
- le fichier de vérification Google existant ;
- six icônes PWA ;
- une capture PWA.

Le manifeste de publication est distinct de `config/runtime-contract.json` et n’est jamais copié dans `dist`.

Le vérificateur contient une seconde copie explicite de l’ensemble approuvé. Cette duplication est intentionnelle : elle évite qu’un manifeste modifié serve simultanément à produire puis à valider tautologiquement un nouvel ensemble non autorisé. Toute évolution de la liste exige donc une modification explicite du manifeste, de la politique de test indépendante et de la preuve CI.

## Build

Le build :

1. valide le manifeste et ses 15 chemins triés ;
2. refuse les chemins absolus Unix et Windows, les chemins non normalisés, la traversée, les séparateurs Windows, les segments vides, les doublons et les collisions de casse ;
3. refuse tout chemin caché ou interne, y compris `.git/**`, `.github/**`, `build-reports/**`, `config/**`, `docs/**`, `scripts/**`, `tests/**` et leurs variantes de casse ;
4. inspecte chaque composant du chemin source et refuse les liens symboliques, y compris un répertoire parent symlinké ;
5. recrée `dist` depuis zéro ;
6. copie uniquement les fichiers autorisés ;
7. conserve sans changement fonctionnel les transformations existantes de `index.html`, `manifest.json` et `sw.js` ;
8. compare l’arbre produit à la liste blanche exacte et refuse aussi les répertoires inattendus ou vides ;
9. valide les références HTML, CSS, `srcset`, manifeste et Service Worker ;
10. génère un inventaire déterministe avec tailles, SHA-256 et classifications.

## Fichiers exclus

Sont notamment exclus :

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
- `package.json`, `package-lock.json` et `build-static.js`.

Les fichiers restent dans le dépôt ; seule leur publication dans `dist` est interdite.

## Vérification des références

Le contrôle inspecte le contenu réellement construit, et non le seul manifeste :

- attributs `src`, `href` et `poster` de `index.html` ;
- candidats de `srcset` et `imagesrcset` ;
- références `url(...)` et `@import` des blocs et attributs de style ;
- enregistrements du Service Worker ;
- icônes, raccourcis et screenshots de `manifest.json` ;
- ressources locales de `STATIC_ASSETS` et fallbacks `caches.match(...)` de `sw.js`.

Les URL externes, ancres, routes dynamiques, `mailto:`, `data:` et `/cdn-cgi/` sont classées séparément. Une référence locale littérale non reconnue comme route dynamique doit correspondre à un fichier réel, y compris si elle ne possède pas d’extension.

La référence JSON-LD préexistante vers `https://julvox.com/logo.png` est inscrite explicitement dans le rapport comme anomalie hors périmètre. Elle n’est pas présentée comme une ressource QUALITY-01A conforme et aucun faux `logo.png` n’est créé.

## Scan heuristique de secrets

Tous les fichiers portant une extension textuelle autorisée sont lus. Les formats binaires sont ignorés uniquement lorsqu’ils appartiennent à une liste explicite ; une extension non classifiée fait échouer le contrôle.

Le scan recherche notamment :

- matériaux de clé privée PEM ;
- tokens GitHub ;
- clés d’accès AWS ;
- clés Stripe secrètes ;
- credentials intégrés dans une URL ;
- JWT littéraux ;
- affectations évidentes de mot de passe, `DATABASE_URL`, `PRIVATE_KEY`, `SECRET`, `API_KEY`, token d’accès, `CLIENT_SECRET` ou credentials.

Des fixtures construites à l’exécution vérifient que chaque détecteur minimal reste actif sans stocker de faux secret plausible dans le dépôt. Le scan reste heuristique : son succès réduit le risque mais ne garantit pas mathématiquement l’absence de toute information sensible.

## Rapports machine-readable

Le build produit hors de `dist` :

- `build-reports/public-artifact-inventory.json` ;
- `build-reports/public-reference-report.json`.

L’inventaire ne contient ni horodatage, ni SHA source, ni autre métadonnée variable. Il peut être comparé octet pour octet entre deux builds successifs.

## Déterminisme

Le contrôle de déterminisme :

1. dépose avant chaque build un marqueur obsolète dans `dist` ;
2. exécute deux fois la chaîne complète `npm run build` ;
3. vérifie que le marqueur a été supprimé par la reconstruction de `dist` ;
4. compare les octets des deux inventaires ;
5. compare les chemins, tailles, classifications et SHA-256 analysés.

L’ordre des fichiers est déterminé par le manifeste trié et par des tris explicites ; il ne dépend pas de l’ordre retourné par le système de fichiers.

## Validation

Commandes :

```text
npm run build
npm run verify:dist
npm run verify:public-artifact
npm run verify:public-references
npm run verify:public-determinism
```

La CI réexécute les contrôles sur le même checkout, compare aussi l’arbre de `dist` à une liste indépendante écrite dans le workflow, puis archive séparément l’artefact et les rapports produits pendant ce run.

## Revue finale

La revue finale du 4 août 2026 a reproduit puis corrigé quatre faiblesses de défense en profondeur :

1. un répertoire parent symlinké pouvait faire lire un fichier situé hors de la racine malgré un chemin lexical interne ;
2. certaines interdictions de chemins internes étaient sensibles à la casse ;
3. un répertoire inattendu mais vide n’entrait pas dans l’inventaire de fichiers ;
4. l’ensemble exact était principalement produit et comparé à partir du même manifeste, laissant un risque de validation circulaire.

La revue a également renforcé les références CSS, `srcset`, les credentials du scan heuristique et la preuve de reconstruction propre. Aucun de ces défauts n’avait modifié l’artefact CI déjà archivé : celui-ci contenait bien les quinze fichiers attendus. Les corrections empêchent cependant ces contournements dans les builds futurs.

## Limites et anomalies préexistantes

- `admin.html` est absent et doit rester absent ;
- `offline.html` est absent et doit rester absent ;
- la référence JSON-LD `https://julvox.com/logo.png` renvoie déjà 404 et reste hors périmètre ;
- le fichier `google3a92a4041aeeec5e.html` est conservé par prudence ;
- aucun comportement du Service Worker, de l’authentification, des paiements, des API ou de l’interface n’est modifié ;
- le smoke HTTP local porte sur l’artefact CI exact servi depuis une racine statique propre ; il ne remplace pas un smoke distant lorsque la preview Vercel est protégée par SSO.

## Rollback

Le rollback consiste à rétablir les commits de build QUALITY-01A par revert, puis à redéployer un artefact correspondant au SHA Git. Les preuves avant/après restent conservées dans la PR et dans les artefacts CI.
