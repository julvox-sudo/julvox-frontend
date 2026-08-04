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

## Build

Le build :

1. valide le manifeste et ses 15 chemins triés ;
2. refuse les chemins absolus, non normalisés, avec traversée, séparateur Windows, doublon ou collision de casse ;
3. recrée `dist` depuis zéro ;
4. copie uniquement les fichiers autorisés ;
5. conserve sans changement fonctionnel les transformations existantes de `index.html`, `manifest.json` et `sw.js` ;
6. compare l’arbre produit à la liste blanche exacte ;
7. valide les références HTML, manifeste et Service Worker ;
8. génère un inventaire déterministe avec tailles, SHA-256 et classifications.

## Fichiers exclus

Sont notamment exclus :

- `.github/**` ;
- `config/**` ;
- `docs/**` ;
- `scripts/**` ;
- `tests/**` ;
- `node_modules/**` ;
- les fichiers Markdown, temporaires, sauvegardes et journaux ;
- `package.json`, `package-lock.json` et `build-static.js`.

Les fichiers restent dans le dépôt ; seule leur publication dans `dist` est interdite.

## Rapports machine-readable

Le build produit hors de `dist` :

- `build-reports/public-artifact-inventory.json` ;
- `build-reports/public-reference-report.json`.

L’inventaire ne contient pas d’horodatage et peut donc être comparé octet pour octet entre deux builds successifs.

## Validation

Commandes prévues :

```text
npm run build
npm run verify:dist
npm run verify:public-artifact
npm run verify:public-references
npm run verify:public-determinism
```

La CI archive séparément l’artefact et les rapports.

## Limites et anomalies préexistantes

- `admin.html` est absent et doit rester absent ;
- `offline.html` est absent et doit rester absent ;
- la référence JSON-LD `https://julvox.com/logo.png` renvoie déjà 404 et reste hors périmètre ;
- le fichier `google3a92a4041aeeec5e.html` est conservé par prudence ;
- aucun comportement du Service Worker, de l’authentification, des paiements, des API ou de l’interface n’est modifié.

## Rollback

Le rollback consiste à rétablir l’ancien commit de build par revert, puis à redéployer un artefact correspondant au SHA Git. La preuve avant/après est conservée dans la PR et dans les artefacts CI.
