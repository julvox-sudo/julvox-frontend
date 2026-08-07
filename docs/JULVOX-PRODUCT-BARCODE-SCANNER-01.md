# JULVOX-PRODUCT-BARCODE-SCANNER-01

## Statut

- Frontend scanner shell: implémenté sur `feat/product-barcode-scanner-01`.
- Branche de base: head vérifié de `product-realign-01b-home-final` au démarrage du chantier (`3709163693e4e5d2414b63e99105c74d263a0d75`).
- Backend audité: `julvox-sudo/julvox-dealscan-backend` `main` au commit `d021d709ab95792094be4228ba318f0541fd6a53`.
- Aucune API tierce produit/prix ajoutée.
- Aucune source commerciale ajoutée.
- Aucune modification du branding Julvox A2.2.
- Aucune modification de la PR #25.

## 1. Intention produit

Le scanner est un point d'entrée vers le moteur de décision Julvox:

```text
SCANNER
→ COMPRENDRE LE PRODUIT
→ COMPRENDRE LE PRIX
→ COMPRENDRE LE CONTEXTE
→ DÉCIDER
→ CONTINUER AVEC JULVOX
```

Le code-barres n'est pas une preuve qu'une offre est bonne. Il sert d'identifiant candidat. Le prix rayon, les conditions commerciales, l'historique et les préférences restent des faits séparés.

Le scanner ne doit jamais transformer automatiquement un rabais affiché en recommandation d'achat.

## 2. Audit des capacités existantes

### Frontend

La branche PR #25 est un frontend statique sans dépendances npm déclarées. Elle possède déjà:

- un accueil Julvox orienté décision;
- un assistant intégré;
- un PWA manifest;
- un service worker;
- des tests Android/offline;
- une chaîne de build déterministe et une whitelist stricte de l'artefact public.

Conséquence: le scanner est ajouté comme module de build qui injecte son runtime dans `dist/index.html`, sans ajouter de fichier public ni de dépendance tierce.

### Backend historique

Les modèles historiques contiennent déjà:

- `Product.ean`;
- `Product.brand`, `name`, `category`, `image_url`;
- `PriceHistory` par produit, marchand et date;
- `Deal` avec prix courant, ancien prix déclaré, marchand et date;
- `PromoCode` avec conditions et état de vérification.

Cependant, aucune route actuelle vérifiée ne fournit un lookup `EAN/UPC → produit`.

La route de comparaison actuelle recherche les produits par nom et non par code-barres.

Le chemin historique d'analyse ne doit pas être réutilisé tel quel pour le scanner: il contient encore des comportements de fallback incompatibles avec les garde-fous du scanner, notamment la possibilité d'utiliser un prix de référence synthétique lorsqu'un prix d'origine manque.

### Backend moderne

Le dépôt dispose désormais de briques modernes d'observation, acquisition, normalisation, projection factuelle et adaptation du contexte de décision. Elles constituent une bonne fondation, mais l'audit n'a pas trouvé de façade scanner ni de connecteur catalogue EAN/GTIN de production.

Conclusion de l'audit:

- identité par code stockable: **oui**;
- endpoint de lookup code-barres: **non vérifié / absent dans les routes auditées**;
- prix historiques internes: **oui, mais couverture et qualité variables**;
- offres historiques: **oui, mais ne constituent pas seules une source scanner fiable**;
- promotions structurées complètes: **partielles**;
- catalogue canonique EAN/UPC moderne: **non démontré**;
- couverture France multi-marchands fraîche: **non démontrée**.

## 3. Architecture scanner

Responsabilités frontend cibles:

```text
BarcodeScanner
├── ScannerCamera
├── ManualBarcodeInput
├── ProductIdentification
├── StorePriceInput
├── PriceLabelCapture        # non activé tant que l'OCR/transmission n'est pas audité
├── ProductScanResult
├── PriceComparison          # alimenté seulement par backend fiable
├── PriceHistorySummary      # alimenté seulement par backend fiable
├── BuyNowDecision           # décision backend / moteur Julvox
├── ScanHistory
└── AskJulvoxFromScan
```

Implémentation actuelle:

- `scripts/product-barcode-scanner-01.js`
  - UI scanner;
  - caméra;
  - détection native lorsque disponible;
  - saisie manuelle;
  - arrêt caméra;
  - stockage local minimal hors ligne;
  - prix rayon;
  - contexte assistant;
  - frontière `window.JulvoxProductScanBackend`.
- `scripts/product-barcode-scanner-01-integrate.js`
  - injection déterministe dans l'artefact public.
- `tests/ui-00/product-barcode-scanner-01.test.js`
  - contrats scanner, confidentialité, offline, accessibilité et anti-manipulation.

## 4. Choix caméra / décodage

### Choix initial Android

Utiliser:

- `navigator.mediaDevices.getUserMedia()` pour la caméra;
- `BarcodeDetector` lorsqu'il existe;
- interrogation de `BarcodeDetector.getSupportedFormats()` avant construction du détecteur;
- formats prioritaires: `ean_13`, `ean_8`, `upc_a`, `upc_e`;
- saisie manuelle toujours disponible.

Pourquoi aucun décodeur JS tiers dans cet incrément:

1. le frontend n'a actuellement aucune dépendance npm;
2. l'objectif prioritaire est Android/PWA;
3. le scanner doit rester hors ligne et léger;
4. ajouter une bibliothèque exige un audit licence, maintenance, poids et compatibilité;
5. `BarcodeDetector` n'est pas universel: la saisie manuelle est donc un fallback obligatoire, pas une solution cachée.

Une future bibliothèque de fallback pourra être introduite dans `ScannerCamera` sans modifier le contrat produit, après audit.

## 5. Wireframes Android

### Accueil

```text
┌──────────────────────────────────────┐
│ Que veux-tu décider aujourd'hui ?   │
│ [ Qu'est-ce qui te fait hésiter ? ] │
│                                      │
│ [ Scanner un produit ]               │
│ [ Un canapé ] [ Un casque ] [...]    │
└──────────────────────────────────────┘
```

### Scanner

```text
┌──────────────────────────────────────┐
│ Scanner un produit               [×] │
│ Le code identifie le produit.        │
│ Le prix rayon est séparé.            │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │           caméra                │ │
│ │       ┌──────────────┐          │ │
│ │       │ code-barres  │          │ │
│ │       └──────────────┘          │ │
│ └──────────────────────────────────┘ │
│ [ Activer caméra ] [ Arrêter ]       │
│                                      │
│ Ou saisir le code                    │
│ [ 3274080005003              ]       │
│ [ Identifier ce code ]               │
└──────────────────────────────────────┘
```

### Résultat minimal tant que les sources manquent

```text
┌──────────────────────────────────────┐
│ Produit à identifier                 │
│ Code: 3274080005003                  │
│ Format: ean_13                       │
│ Prix magasin: non renseigné          │
│                                      │
│ INFORMATIONS INSUFFISANTES           │
│ Le code est enregistré, mais Julvox  │
│ ne possède pas encore les données    │
│ nécessaires pour un avis fiable.     │
│                                      │
│ Prix affiché: [ 89,99 ] [Enregistrer]│
│ [ Demander à Julvox ]                │
│ [ Recommencer ]                      │
└──────────────────────────────────────┘
```

### Résultat cible après backend

```text
┌──────────────────────────────────────┐
│ Sony WH-1000XM6                      │
│ 349,00 € en magasin                  │
│                                      │
│ COMPARER AVANT D'ACHETER             │
│ Le prix rayon est supérieur aux      │
│ offres fraîches comparables.         │
│                                      │
│ Pourquoi                             │
│ • prix rayon                         │
│ • meilleur prix vérifié              │
│ • historique disponible              │
│ • préférences / budget               │
│                                      │
│ [ Comparer ] [ Demander à Julvox ]   │
└──────────────────────────────────────┘
```

## 6. Parcours magasin complet

1. Ouvrir `Scanner un produit`.
2. Julvox explique la séparation produit/prix.
3. Autoriser la caméra ou choisir la saisie manuelle.
4. Scanner un EAN/UPC.
5. Arrêter immédiatement le flux caméra après détection.
6. Enregistrer localement le code et l'heure.
7. Si réseau et backend disponibles, identifier le produit.
8. Si ambigu, afficher l'incertitude ou plusieurs correspondances.
9. Demander le prix réellement affiché en rayon.
10. Charger offres/historique uniquement depuis des sources auditées.
11. Construire la décision Julvox.
12. Afficher décision, raisons, incertitudes et actions suivantes.
13. `Demander à Julvox` transmet automatiquement tout le contexte.
14. Si hors ligne, conserver un brouillon local et proposer l'analyse au retour du réseau.

## 7. Contrat de données cible

```text
ProductScan {
  barcode
  barcodeType
  scannedAt
  identificationStatus
  product {
    id
    brand
    name
    model
    variant
    category
    image
    confidence
  }
  storePrice {
    amount
    currency
    source
  }
  offers[]
  priceHistory
  decision
}

Offer {
  merchant
  price
  currency
  promotionType
  conditions
  availability
  observedAt
  source
  freshness
}

Decision {
  status: buy_now | wait | compare | insufficient_data
  summary
  reasons[]
  uncertainties[]
  nextActions[]
  confidence
}
```

États d'identification:

```text
IDENTIFIE
IDENTIFICATION_PROBABLE
PLUSIEURS_CORRESPONDANCES
NON_RECONNU
```

## 8. Contrat backend minimal requis

Une façade dédiée est nécessaire. Proposition:

```text
POST /product-scans/resolve
```

Entrée:

```json
{
  "barcode": "3274080005003",
  "barcodeType": "ean_13",
  "scannedAt": "2026-08-07T10:00:00Z",
  "storePrice": {
    "amountMinor": 8999,
    "currency": "EUR",
    "source": "user_store_shelf"
  }
}
```

Sortie:

```json
{
  "identificationStatus": "IDENTIFIE",
  "product": {},
  "offers": [],
  "priceHistory": null,
  "decision": {
    "status": "insufficient_data",
    "summary": "Historique insuffisant.",
    "reasons": [],
    "uncertainties": ["Historique non disponible"],
    "nextActions": ["Comparer les offres fraîches"]
  }
}
```

Contraintes:

- monnaie en unités mineures côté backend moderne;
- provenance obligatoire;
- fraîcheur obligatoire pour les données externes;
- aucune référence synthétique masquée;
- ambiguïtés conservées;
- données absentes représentées comme absentes;
- décision produite par le moteur Julvox, pas par le scanner UI;
- idempotence sur le scan logique si persisté;
- utilisateur issu du contexte authentifié, pas d'un `userId` client libre.

Le frontend expose temporairement une frontière `window.JulvoxProductScanBackend.lookup(...)`. Elle ne contacte rien par défaut: en l'absence d'adaptateur réel, le résultat reste `insufficient_data`.

## 9. Sources nécessaires

### Identité produit

Besoin d'au moins une source capable de résoudre réellement GTIN/EAN/UPC avec une couverture France suffisante.

Audit obligatoire avant intégration:

- licence;
- droits de réutilisation;
- quota;
- coût;
- fraîcheur;
- couverture par catégorie;
- qualité des variantes;
- couverture France;
- droit d'affichage des images;
- droit de conservation;
- politique de données;
- SLA / stabilité;
- mécanismes de correction.

Aucune source n'est sélectionnée dans cet incrément.

### Prix et offres

Réutiliser en priorité la chaîne d'observations moderne lorsqu'elle dispose d'une offre correspondant exactement au produit/scopage.

Il manque encore une preuve de couverture suffisante pour répondre systématiquement après scan en magasin.

### Historique

L'historique historique peut aider à caractériser des cas existants, mais il ne doit pas être présenté comme représentatif sans contrôle de qualité, de fraîcheur et de couverture.

### Conditions commerciales

Les conditions doivent être structurées. Exemple de types:

```text
immediate_discount
coupon
loyalty_card
cashback
bundle
conditional
online_only
store_only
```

Une condition de carte fidélité ne doit jamais devenir une réduction immédiate dans le rendu.

## 10. Impacts frontend

### Déjà implémentés

- CTA visible `Scanner un produit` sur l'accueil;
- modal Android-first;
- caméra arrière préférée;
- EAN/UPC prioritaires;
- saisie manuelle;
- arrêt caméra après détection;
- haptique facultatif;
- saisie du prix rayon;
- décision `insufficient_data` par défaut;
- frontière backend;
- transmission du contexte à l'assistant;
- brouillon hors ligne;
- historique scanner uniquement si l'historique utilisateur est explicitement activé.

### À implémenter après backend

- rendu produit réel;
- choix de variantes ambiguës;
- comparaison d'offres;
- résumé historique;
- décision Julvox complète;
- reprise `Analyser maintenant` vers la vraie façade;
- intégration `Scanné récemment` dans l'accueil;
- photo d'étiquette et OCR seulement après décision explicite sur confidentialité et technologie.

## 11. Impacts PWA

- le scanner ne dépend pas du réseau pour ouvrir;
- `getUserMedia()` exige un contexte sécurisé;
- le service worker existant doit continuer à servir l'app shell;
- un scan hors ligne est conservé localement;
- aucun appel réseau n'est fabriqué par le scanner;
- la caméra est arrêtée sur `visibilitychange` et `pagehide`;
- aucune vidéo n'est enregistrée;
- aucun raccourci PWA scanner n'est ajouté dans ce premier incrément afin de ne pas modifier le contrat de manifest déjà durci dans la PR #25.

## 12. Accessibilité

Implémenté:

- statut visuel avec `aria-live`;
- aucune confirmation exclusivement sonore;
- vibration uniquement facultative;
- saisie manuelle permanente;
- libellés de formulaire;
- dialogue modal sémantique;
- fermeture `Escape`;
- restauration du focus au déclencheur;
- boutons avec hauteur tactile minimale de 48 px;
- contraste cohérent avec la palette Julvox;
- adaptation portrait/paysage;
- `prefers-reduced-motion`.

Validation humaine TalkBack reste obligatoire.

## 13. Confidentialité

Règles d'implémentation:

- flux caméra uniquement pendant le scan;
- arrêt après détection;
- arrêt à la fermeture;
- arrêt si la page passe en arrière-plan;
- aucune capture vidéo;
- aucune photo d'étiquette dans ce premier incrément;
- aucun envoi d'image externe;
- historique scanner uniquement si `julvox:history:enabled === true`;
- stockage hors ligne limité à un brouillon opérationnel de scan;
- aucune donnée commerciale externe transmise tant que la façade backend n'est pas définie.

## 14. Stratégie hors ligne

### Disponible immédiatement

```text
scan local
→ barcode + format + scannedAt
→ prix rayon éventuel
→ session courante
→ brouillon pending local si offline
→ décision = insufficient_data
```

Message:

> Produit enregistré. Connexion nécessaire pour rechercher les prix, les conditions disponibles et obtenir l'analyse Julvox.

### Retour réseau

Le bouton `Analyser maintenant` relance la frontière backend si elle est disponible. Tant qu'elle ne l'est pas, le scanner reste honnêtement en état insuffisant.

## 15. Cas d'erreur

| Cas | Comportement |
|---|---|
| `CAMERA_REFUSEE` | « Autorise la caméra ou saisis le code manuellement. » |
| `CODE_ILLISIBLE` | rapprochement caméra / saisie manuelle |
| `PRODUIT_NON_RECONNU` | `NON_RECONNU`, aucune identité inventée |
| `PLUSIEURS_VARIANTES` | contrat backend prévoit plusieurs correspondances; UI détaillée après backend |
| `PAS_DE_PRIX_DISPONIBLE` | aucune comparaison inventée |
| `PAS_D_HISTORIQUE` | aucune tendance inventée |
| `HORS_LIGNE` | brouillon local + analyse différée |
| `BARCODE_DETECTOR_INDISPONIBLE` | saisie manuelle immédiatement proposée |

## 16. Tests

### Tests automatiques ajoutés

`tests/ui-00/product-barcode-scanner-01.test.js` couvre:

- intégration idempotente;
- formats EAN/UPC prioritaires;
- aucune dépendance scanner tierce;
- arrêt des tracks caméra;
- arrière-plan / page hide;
- saisie manuelle;
- offline;
- `insufficient_data` par défaut;
- absence du fallback de prix synthétique interdit;
- prix rayon séparé;
- historique opt-in;
- contexte assistant;
- accessibilité structurelle;
- conservation explicite de l'ambiguïté backend.

### Tests à ajouter au backend

- lookup EAN-13 unique;
- EAN-8;
- UPC-A;
- UPC-E;
- code invalide;
- produit absent;
- produit ambigu;
- variante exacte;
- fraîcheur des offres;
- conditions commerciales;
- absence d'historique;
- décision buy/wait/compare/insufficient;
- anti-manipulation;
- idempotence;
- séparation prix utilisateur / prix source;
- provenance.

## 17. Procédure de validation Android réelle

Navigateur Chrome puis PWA installée:

1. ouvrir l'accueil;
2. vérifier la présence de `Scanner un produit`;
3. ouvrir le scanner;
4. accepter la caméra;
5. scanner un EAN-13 réel;
6. vérifier le retour visuel;
7. vérifier que la caméra s'arrête après détection;
8. saisir le prix rayon;
9. vérifier `INFORMATIONS INSUFFISANTES` tant que le backend scanner n'est pas relié;
10. ouvrir `Demander à Julvox` et vérifier que code + prix sont déjà dans le contexte;
11. revenir à l'accueil;
12. rouvrir le scanner;
13. tourner portrait/paysage;
14. passer l'application en arrière-plan puis revenir et vérifier que la caméra est coupée;
15. refuser la caméra et vérifier la saisie manuelle;
16. réaccorder la permission puis recommencer;
17. tester EAN-8;
18. tester UPC-A;
19. tester UPC-E si le navigateur le déclare supporté;
20. activer le mode avion;
21. scanner ou saisir un code;
22. vérifier le message de conservation locale;
23. saisir un prix;
24. réactiver le réseau;
25. vérifier `Analyser maintenant`;
26. fermer et rouvrir la PWA;
27. tester le bouton Retour Android;
28. répéter avec alimentaire emballé, électronique, maison et hygiène/cosmétique.

Points à observer manuellement:

- TalkBack;
- focus;
- lisibilité;
- zone tactile;
- permission PWA installée;
- rotation pendant capture;
- réouverture après mise en veille;
- absence de caméra active après fermeture.

## 18. Découpage d'implémentation

### Incrément A — frontend local et honnête

**Implémenté dans cette branche.**

- point d'entrée;
- caméra;
- formats;
- saisie manuelle;
- prix rayon;
- offline;
- confidentialité;
- assistant;
- tests.

### Incrément B — contrat backend scanner

- endpoint `product-scans/resolve`;
- validation GTIN/UPC;
- contrat de provenance/fraîcheur;
- branchement observation → produit → offres → historique → décision;
- aucune nouvelle source externe encore.

### Incrément C — audit et intégration source produit

- comparer les fournisseurs candidats;
- licence / coût / quota / France / variantes / images;
- sélectionner explicitement ou conclure qu'aucune source ne convient;
- ajouter un connecteur à la chaîne moderne.

### Incrément D — prix et conditions multi-source

- correspondance exacte produit;
- offres fraîches;
- conditions structurées;
- historique qualifié;
- contrôle des références de prix.

### Incrément E — UX décision complète

- produit identifié;
- variantes;
- comparaison;
- historique;
- personnalisation;
- décision;
- `Scanné récemment`;
- reprise assistant.

### Incrément F — photo étiquette / OCR, si justifié

Seulement après audit de la capacité OCR et de la politique de transmission/conservation d'image.

## 19. Risques / limites actuelles

1. `BarcodeDetector` n'est pas une API universelle; la validation Android réelle est obligatoire.
2. Sans source produit, le scanner peut lire un code mais pas prétendre connaître le produit.
3. Sans couverture prix fiable, aucune comparaison systématique n'est possible.
4. Les données historiques DealScan ne doivent pas être promues automatiquement au rang de faits scanner modernes.
5. Le scanner dépend de la stabilité de l'app shell PWA pour l'ouverture hors ligne.
6. Le backend moderne possède les briques de décision et d'observation, mais la façade barcode n'existe pas encore.

## 20. Verdict

`BACKEND_DATA_SOURCES_REQUIRED`

Le frontend scanner peut être construit et a reçu son premier incrément sans inventer de données. La fonctionnalité complète demandée — identification exacte, comparaison réelle, historique qualifié et décision d'achat — exige maintenant une façade backend scanner et des sources produit/prix auditées.
