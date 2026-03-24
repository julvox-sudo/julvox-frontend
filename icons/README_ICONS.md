# Icônes PWA à générer — DealScan

## CORRECTIF #17
Le manifest.json référençait des icônes en format `data:image/svg+xml`.
Ce format n'est PAS supporté par Android et iOS pour l'installation PWA.
Générez les fichiers PNG ci-dessous et placez-les dans ce dossier `/icons/`.

## Fichiers requis

| Fichier                            | Taille  | Usage                           |
|------------------------------------|---------|----------------------------------|
| icon-192.png                       | 192×192 | Icône principale Android         |
| icon-512.png                       | 512×512 | Icône splash / maskable          |
| shortcut-deals.png                 | 96×96   | Raccourci "Top Deals"            |
| shortcut-flash.png                 | 96×96   | Raccourci "Ventes Flash"         |
| shortcut-promos.png                | 96×96   | Raccourci "Codes Promo"          |
| shortcut-alerts.png                | 96×96   | Raccourci "Mes Alertes"          |
| ../screenshots/screenshot-mobile.png | 390×844 | Screenshot écran d'installation |

## Génération rapide (outils en ligne)
- https://realfavicongenerator.net/
- https://progressier.com/pwa-icons-and-ios-splash-screen-generator

## Design recommandé
- Fond orange `#FF5C2B`, coins arrondis (radius = 20% de la dimension)
- Emoji 🔥 centré, texte blanc, pour icon-192 et icon-512
- icon-512 doit être "maskable" : zone safe = cercle centré à 80% de la taille totale

## Validation PWA après génération
https://www.pwabuilder.com/
