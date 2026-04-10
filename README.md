# DealScan — Frontend

Agrégateur de deals France — julvox.com

## Stack
- **Hébergement** : Vercel (CDN mondial, HTTPS automatique)
- **Architecture** : SPA (`index.html`) + Service Worker PWA
- **Offline** : `sw.js` avec stratégie cache-first

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Application complète (16 000+ lignes, tout-en-un) |
| `enhancements_v3.js` | Modules JS additionnels (ticker, swipe feed, dark mode) |
| `sw.js` | Service Worker — cache offline + push notifications |
| `manifest.json` | Métadonnées PWA (nom, icônes, raccourcis Android) |
| `vercel.json` | Config Vercel — headers CSP, rewrites API |
| `robots.txt` | Directives crawlers SEO |

## Icônes PWA (distinctes par raccourci)

| Fichier | Couleur | Usage |
|---|---|---|
| `icons/icon-192.png` | 🟠 Orange `#FF5C2B` | Icône principale 192px |
| `icons/icon-512.png` | 🟠 Orange `#FF5C2B` | Icône principale 512px |
| `icons/shortcut-deals.png` | 🟠 Orange | Raccourci → Deals |
| `icons/shortcut-flash.png` | 🟡 Jaune `#FFB800` | Raccourci → Flash deals |
| `icons/shortcut-promos.png` | 🟣 Violet `#A13DFF` | Raccourci → Promos |
| `icons/shortcut-alerts.png` | 🟢 Vert `#00D084` | Raccourci → Alertes |

## Déploiement Vercel
```bash
git push origin main  # déploiement automatique via GitHub
```

## Variables d'environnement (vercel.json)
Aucune variable côté frontend — l'API backend est configurée dans `vercel.json`.
