# DealScan — Frontend

SPA Vercel (julvox.com) — PWA complète.

## Fichiers principaux
- `index.html` — Application complète
- `enhancements_v3.js` — Modules JS (ticker, feed, dark mode)
- `sw.js` — Service Worker cache offline + push
- `manifest.json` — Config PWA
- `vercel.json` — Headers sécurité + rewrites API
- `robots.txt` — SEO

## Icônes PWA (6 distinctes)
| Fichier | Couleur | Usage |
|---|---|---|
| `icons/icon-192.png` | 🟠 `#FF5C2B` | Icône principale 192px |
| `icons/icon-512.png` | 🟠 `#FF5C2B` | Icône principale 512px |
| `icons/shortcut-deals.png` | 🟠 Orange | Raccourci Deals |
| `icons/shortcut-flash.png` | 🟡 `#FFB800` | Raccourci Flash |
| `icons/shortcut-promos.png` | 🟣 `#A13DFF` | Raccourci Promos |
| `icons/shortcut-alerts.png` | 🟢 `#00D084` | Raccourci Alertes |

## ⚠️ À faire
Supprimer `google02468516a5a293f6.html` du dépôt git (`git rm`) — vérification Google obsolète.
