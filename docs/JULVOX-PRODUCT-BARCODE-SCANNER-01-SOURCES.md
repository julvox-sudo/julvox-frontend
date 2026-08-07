# JULVOX-PRODUCT-BARCODE-SCANNER-01 — audit de sources candidates

## Objet

Ce document complète l'audit du scanner. Il ne sélectionne ni n'intègre silencieusement aucune API tierce. Il distingue les sources candidates par rôle et rappelle les vérifications contractuelles encore nécessaires avant toute connexion de production.

## 1. Principe de sourcing

Le scanner Julvox a besoin de plusieurs familles de faits, qui ne doivent pas être confondues:

```text
validité du code
≠ identité du produit
≠ prix observé en magasin
≠ offre marchande
≠ promotion
≠ historique
≠ décision
```

Aucune source unique auditée ici ne couvre honnêtement toutes ces responsabilités et toutes les catégories demandées.

## 2. Source candidate — Open Food Facts

Documentation officielle:

- https://openfoodfacts.github.io/openfoodfacts-server/api/
- https://openfoodfacts.github.io/documentation/docs/Product-Opener/v3/products/get-api-v3-product-code/

Capacité utile:

- lecture d'un produit à partir d'un code-barres;
- API v3 actuelle;
- marque, nom, catégories, images et autres attributs lorsqu'ils existent;
- familles sœurs Open Beauty Facts / Open Products Facts sur la même base logicielle.

Licence / réutilisation déclarée par le projet:

- base Open Food Facts: ODbL;
- contenus individuels: Database Contents License;
- images produits: CC BY-SA, avec avertissement sur d'autres droits possibles.

Limites importantes:

- données contributives;
- documentation officielle indiquant qu'il n'existe pas de garantie d'exactitude, complétude ou fiabilité;
- Open Beauty Facts et Open Products Facts sont documentés comme expérimentaux et n'ont pas tous les services disponibles sur Open Food Facts;
- ce n'est pas une source universelle suffisante pour l'électronique, la maison et tous les produits non alimentaires.

Décision actuelle:

```text
CANDIDAT POUR IDENTIFICATION ALIMENTAIRE
PAS SOURCE UNIVERSELLE
AUDIT JURIDIQUE ODbL/IMAGES REQUIS AVANT PRODUCTION
```

## 3. Source candidate — Verified by GS1

Documentation officielle:

- https://www.gs1.org/services/verified-by-gs1
- https://support.gs1.org/support/solutions/articles/43000734077-what-is-verified-by-gs1-

Capacité utile:

- vérifier un GTIN / UPC / EAN dans le système GS1;
- retrouver au minimum l'organisation ayant attribué le GTIN;
- obtenir des informations produit lorsqu'elles sont présentes;
- usage particulièrement pertinent comme corroboration de l'identité et de la validité du numéro.

Accès déclaré publiquement:

- interface gratuite limitée à 30 requêtes par jour;
- capacités avancées, dont API, accessibles via l'organisation membre GS1 compétente.

Limites importantes:

- l'accès gratuit public n'est pas dimensionné pour un scanner Julvox à grande échelle;
- toutes les fiches ne garantissent pas le même niveau de détail produit;
- les conditions, coûts, quotas et droits de conservation d'une API professionnelle doivent être négociés/audités avec GS1 France ou l'organisation compétente.

Décision actuelle:

```text
CANDIDAT FORT POUR VERIFICATION GTIN
PAS INTEGRABLE A GRANDE ECHELLE SANS CONTRAT/API AUDITES
```

## 4. Source candidate — Open Prices

Documentation officielle:

- https://openfoodfacts.github.io/open-prices/
- https://openfoodfacts.github.io/open-prices/topics/core/
- https://openfoodfacts.github.io/open-prices/guides/data/

Capacité utile:

- observations de prix alimentaires;
- rattachement à un produit par code-barres lorsqu'il existe;
- preuve associée (par exemple étiquette ou ticket), localisation et historique;
- API et exports;
- données sous ODbL selon la documentation du projet.

Limites importantes:

- couverture centrée sur les produits alimentaires;
- données contributives et couverture variable selon lieu/marchand/date;
- le prix doit être traité comme une observation datée et localisée, pas comme « le prix du marché »;
- contraintes ODbL à analyser avant combinaison avec des sources non libres;
- les localisations et preuves demandent un traitement de confidentialité spécifique.

Décision actuelle:

```text
CANDIDAT AUXILIAIRE POUR PRIX ALIMENTAIRES
PAS SOURCE DE PRIX UNIVERSELLE
NE DOIT PAS ETRE CONFONDU AVEC UN COMPARATEUR MULTI-MARCHANDS
```

## 5. Sources historiques du backend Julvox

Le backend contient ou a contenu des chemins historiques associés notamment à:

- Dealabs RSS;
- Amazon public deals;
- Awin;
- Lidl;
- Too Good To Go.

Ces sources ne sont pas automatiquement qualifiées pour le scanner.

Avant réutilisation, chacune doit être classée:

```text
réutiliser
encapsuler
migrer
remplacer
retirer
```

avec audit obligatoire de:

- conditions d'utilisation;
- droit de collecte;
- droit de conservation;
- quota;
- coût;
- disponibilité France;
- correspondance exacte GTIN/variante;
- fraîcheur;
- promotion et conditions;
- marchand / vendeur tiers;
- disponibilité;
- provenance;
- résilience et changements de schéma.

Les anciennes valeurs de démonstration, fallbacks, notes statiques, stocks supposés et prix de référence synthétiques sont interdits dans la chaîne scanner moderne.

## 6. Stratégie source recommandée

### Couche A — validation du code

Locale et déterministe:

- chiffres et longueur;
- chiffre de contrôle;
- normalisation explicite;
- conservation du code original.

Aucun réseau nécessaire.

### Couche B — identité produit

Stratégie de corroboration:

1. catalogue Julvox canonique, lorsqu'il existe;
2. source spécialisée auditable par catégorie;
3. source d'autorité / corroboration GTIN telle que GS1 lorsque contractuellement disponible;
4. si conflit: `IDENTIFICATION_PROBABLE` ou `PLUSIEURS_CORRESPONDANCES`, jamais fusion silencieuse.

### Couche C — prix et promotions

Priorité aux observations factuelles:

- prix saisi en rayon par l'utilisateur;
- feeds ou APIs marchands autorisés;
- observations Julvox modernes;
- sources contributives avec provenance lorsqu'elles sont pertinentes;
- conditions commerciales structurées.

Le prix utilisateur n'est jamais écrasé par une source distante.

### Couche D — historique

La source de confiance à long terme doit devenir la mémoire de prix Julvox:

```text
observations datées
→ normalisation
→ déduplication stricte
→ contradictions conservées
→ séries temporelles
→ statistiques explicables
```

Une source externe peut enrichir l'historique, mais ne doit pas fabriquer une tendance sans couverture suffisante.

### Couche E — décision

Le moteur de décision reçoit des faits avec:

- provenance;
- fraîcheur;
- indépendance;
- qualité;
- contradictions;
- préférences utilisateur;
- incertitudes.

Le scanner UI ne calcule pas lui-même `buy_now`, `wait` ou `compare`.

## 7. Audit obligatoire avant intégration de toute source

Pour chaque fournisseur ou source candidate, documenter avant code de production:

| Axe | Question obligatoire |
|---|---|
| Licence | Julvox peut-il lire, afficher, stocker et recombiner ces données ? |
| Attribution | Quelle attribution doit apparaître ? |
| Partage | Une licence copyleft impose-t-elle des obligations sur la base combinée ? |
| Quota | Limite par seconde, minute, jour et compte ? |
| Coût | Gratuit, forfait, usage, contrat entreprise ? |
| France | Couverture réelle des références vendues en France ? |
| Catégories | Alimentaire, électronique, maison, cosmétique/hygiène ? |
| Variantes | GTIN exact pour taille/couleur/capacité ? |
| Fraîcheur | Horodatage d'observation disponible et fiable ? |
| Prix | Prix article, livraison, taxes et frais distingués ? |
| Promotions | Conditions, fidélité, coupon, cashback, online/store distingués ? |
| Disponibilité | Réelle, estimée ou absente ? |
| Images | Droit d'affichage et de cache ? |
| Conservation | Durée de stockage autorisée ? |
| Vie privée | Localisation, tickets, photos ou identifiants personnels ? |
| Corrections | Mécanisme de retrait/correction/supersession ? |
| SLA | Stabilité et support ? |
| Biais commercial | Classement ou couverture affectés par une relation commerciale ? |

## 8. Conclusion source

Les données ouvertes auditées constituent de bons composants pour certains cas, en particulier l'alimentaire, mais elles ne suffisent pas à fournir la promesse complète Julvox sur les quatre catégories de validation demandées.

La bonne direction n'est pas de choisir un comparateur unique. Elle est de construire une façade backend scanner qui puisse combiner plusieurs sources auditées et la mémoire Julvox sans perdre provenance, fraîcheur ni incertitude.

Verdict source:

```text
BACKEND_DATA_SOURCES_REQUIRED
```
