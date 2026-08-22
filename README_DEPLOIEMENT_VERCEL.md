# Déploiement Vercel — Julvox frontend

Le frontend Julvox est publié comme site statique. Le projet Vercel doit utiliser le pipeline du dépôt, pas un framework Vite ajouté par-dessus.

## Réglages Vercel

- Framework Preset : `Other`
- Root Directory : `./`
- Build Command : `npm run build`
- Output Directory : `dist`
- Node.js : version compatible avec `package.json` (`24.x` sur le candidat actuel)

## Gate avant déploiement

Sur le SHA exact à publier :

1. exécuter `npm run verify:all` lorsque l'environnement de validation le permet ;
2. vérifier que `npm run build` termine sans erreur ;
3. ne pas transférer une preuve provenant d'un autre SHA ;
4. vérifier que le déploiement Preview Vercel correspondant au même SHA atteint `READY`.

## Vérification de l'artefact public

La validation doit porter sur les contrats publics produits par le build (`dist/`) et non sur un ancien marqueur interne DealScan ou sur une valeur de cache figée.

Les points utiles à contrôler sont notamment :

- `/runtime-config.js` est présent et cohérent avec le contrat runtime ;
- `/manifest.json` est servi ;
- `/sw.js` est servi et syntaxiquement valide ;
- les vérifications `verify:production-truth`, `verify:public-artifact`, `verify:public-references` et `verify:public-determinism` restent vertes lorsqu'elles sont exécutées ;
- le déploiement Vercel observé correspond au SHA exact inspecté.

Ne pas utiliser `DEPLOY_MARKER_DEALSCAN_SW_V17` ou `CACHE_VERSION = 'v17'` comme preuve unique de fraîcheur d'un déploiement Julvox : ce sont des résidus internes du service worker source, pas le contrat de certification du produit final.
