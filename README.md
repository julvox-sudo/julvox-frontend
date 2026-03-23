# 🌐 DealScan Frontend — julvox-frontend-main

## Qu'est-ce que c'est ?
Le site web DealScan hébergé sur **Vercel**. C'est une application monopage (SPA) entièrement contenue dans `index.html`.

## Structure des fichiers
```
julvox-frontend-main/
├── index.html        ← L'application complète (HTML + CSS + JS en un fichier)
├── sw.js             ← Service Worker (cache offline + notifications push)
├── manifest.json     ← Manifeste PWA (installation sur l'écran d'accueil)
├── enhancements.js   ← Graphiques historique de prix (chargé après index.html)
├── vercel.json       ← Configuration Vercel (headers sécurité, redirections)
├── robots.txt        ← Instructions pour les moteurs de recherche
└── sitemap.xml       ← Plan du site pour Google
```

## Comment déployer
1. Pousse le dossier sur GitHub
2. Connecte le repo à Vercel (vercel.com)
3. Chaque push sur `main` redéploie automatiquement en 30 secondes

## Comment modifier
- Toutes les modifications se font dans `index.html`
- Le site est découpé en sections commentées (`<!-- ══ NOM ══ -->`)
- Le JS commence à la ligne ~2280 (chercher `<script>`)
- Les styles CSS sont dans le `<head>` (chercher `<style>`)

## Variables d'environnement
Aucune — l'URL du backend est dans `index.html` :
```javascript
const API = 'https://julvox-dealscan-backend-production.up.railway.app';
```
Modifier cette ligne si l'URL Railway change.

## PWA — Installation mobile
L'application est installable sur Android (Chrome) et iOS (Safari) directement depuis le site.
Le `manifest.json` définit les raccourcis écran d'accueil (Flash, Promos, Alertes, Top Deals).

## Maintenance régulière
- Mettre à jour `sitemap.xml` quand de nouvelles pages sont ajoutées
- Incrémenter `CACHE_VERSION` dans `sw.js` après chaque grosse mise à jour (force le rechargement du cache)
- Vérifier Google Search Console pour détecter les erreurs d'indexation
