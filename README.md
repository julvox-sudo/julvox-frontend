# Julvox — Frontend

Frontend web/PWA de Julvox, construit comme un site statique puis publié sur Vercel.

## Commandes principales

- `npm run build` — exécute les tests UI, vérifications de source/runtime, génération de config, composition et validations de l'artefact public dans `dist/`.
- `npm run verify:all` — exécute le build complet puis la vérification de déterminisme public.
- `npm test` — exécute la suite UI principale.

## Fichiers principaux

- `index.html` — source historique de l'application web, encore transformée pendant le build ;
- `build-static.js` — construction initiale de `dist/` ;
- `scripts/` — intégration et vérification des contrats frontend Julvox ;
- `runtime-config.js` / génération associée — configuration runtime publique ;
- `sw.js` — service worker PWA, cache public et push ;
- `manifest.json` — manifeste PWA source ;
- `vercel.json` — configuration de publication et headers Vercel ;
- `brand/` et `icons/` — identité visuelle publique.

## Source de vérité de validation

Ne valider pas un déploiement à partir d'un ancien marqueur DealScan isolé. La preuve attendue est la chaîne de vérification du dépôt : tests + `npm run build`/`npm run verify:all`, puis un déploiement Vercel `READY` correspondant au SHA exact inspecté.

Le frontend contient encore des sources historiques progressivement réconciliées par le pipeline de build. Ne pas considérer une chaîne legacy présente dans un fichier source comme une preuve qu'elle est exposée dans l'artefact final sans vérifier `dist/`.

## Vérification Google

Ne supprimer ni remplacer un fichier de vérification Google simplement parce qu'un ancien README en cite un autre. Vérifier d'abord le fichier réellement attendu par la propriété Search Console active.
