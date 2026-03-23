# 🌐 Frontend — julvox-frontend-main (Vercel)

## Déploiement
Pousser sur GitHub → Vercel redéploie automatiquement.

## Fichiers
- `index.html` — Application complète (HTML + CSS + JS)
- `sw.js` — Service Worker PWA (cache + notifications push)
- `manifest.json` — Manifeste PWA (installation mobile)
- `enhancements.js` — Graphiques historique de prix
- `vercel.json` — Config headers sécurité

## Variable à modifier dans index.html
```js
const API = 'https://julvox-dealscan-backend-production.up.railway.app';
```
