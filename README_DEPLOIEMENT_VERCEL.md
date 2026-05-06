# Déploiement Vercel propre

Ce frontend est un site statique. Il ne faut pas utiliser Vite.

Réglages Vercel recommandés :

- Framework Preset : Other
- Root Directory : ./
- Build Command : npm run build
- Output Directory : dist

Après déploiement, tester :

https://julvox.com/sw.js?fresh=17

Le fichier doit contenir :

DEPLOY_MARKER_DEALSCAN_SW_V17
const CACHE_VERSION = 'v17';
