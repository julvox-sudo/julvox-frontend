# JULVOX-BINARY-INTEGRITY-01 — Rapport final

**Date :** 6 août 2026  
**Dépôt :** `julvox-sudo/julvox-frontend`  
**Branche :** `test/binary-integrity-01`  
**Base :** `main` à `f013900fc639d907776a60f64c6f12e0b09f8739`

## Verdict unique

**4. Intégrité binaire non démontrable avec l’environnement actuel.**

Le pack officiel est authentifié et l’extraction locale est exacte. Le transport UTF-8 des deux SVG et le transport Base64 du favicon PNG de 353 octets sont démontrés. Aucun chemin disponible n’a toutefois permis de créer puis relire le blob Git exact du PNG 512 de 14 322 octets. La preuve intégrale à cinq niveaux n’est donc pas satisfaite pour les cinq échantillons.

## Pack

- taille : **264 613 octets** ;
- SHA-256 recalculé : `5680524562e21367dc20031a9ef0155ce8e475cdb66919158e54e0a3c0f13500` ;
- test ZIP : aucune erreur ;
- 35 fichiers réguliers ;
- 34 empreintes internes ;
- 34/34 conformes ;
- extraction dans un répertoire neuf ;
- cinq échantillons identiques entre ZIP et extraction.

## Mesures

| Fichier | Taille | SHA-256 | SHA Git théorique | Dimensions |
|---|---:|---|---|---:|
| `julvox-logo-horizontal.svg` | 4 221 | `cebca51950d70db87f33100be87adaf28907b99792f2a4eb5e6e7ffcd50bf91f` | `b303b505289324e0028a8adfc74cf82873fba8b4` | — |
| `julvox-glyph-small.svg` | 2 024 | `07b51790ee93467f2e22c47c5af50b91fd6853596ee55307933589dd48f32bd0` | `c41dad92f2b525ebf5e5212758c4ff9f17ad7373` | — |
| `julvox-favicon-16-transparent.png` | 353 | `39596221dc5a077bd5ba56e0ab3d8f4fb39b24d320d0eed12cb313bef526276f` | `d991334e6e0ee7c25cddd9573f16e8add32a15d9` | 16 × 16 |
| `julvox-app-icon-192.png` | 8 722 | `8681b5b78c93fa72dc0837400f4335b899fbb1371572e36bf22587e8b70435f6` | `599031e4a0720d70b320a4c61ecc181a0732a205` | 192 × 192 |
| `julvox-app-icon-512.png` | 14 322 | `b61af9f6b613062a32eab2a1ab4b3dbc6eaa0ea5add3f8fd03de1ab3a298395f` | `c3586617e27b9d8c8ad52d0cb0bf714f98bda975` | 512 × 512 |

Les PNG ont une signature PNG/IHDR réelle. Les SVG sont des documents XML/SVG UTF-8 sans BOM ni CRLF.

## Méthodes

### A. Référence de fichier native

Indisponible : aucune action GitHub exposée n’accepte un objet fichier ou un chemin local pour créer un blob.

### B. API GitHub Base64

Partiellement démontrée :

- favicon exact : SHA Git réel `d991334e6e0ee7c25cddd9573f16e8add32a15d9` ;
- essai PNG 192 divergent : 8 710 octets au lieu de 8 722, SHA Git `5658a1537573a85ba55d77b1401ffa320299e6d2` ;
- essais PNG 512 divergents : blobs orphelins `292f3d14faec1cfafea59dc0a48be8df0f084e89` et `5bf75b010c1f6c754585b83dd9a92a63102b06a5` ;
- aucun blob 512 divergent n’a été rattaché à la branche.

La méthode sait préserver un petit binaire lorsque la chaîne envoyée est exacte. Une grande chaîne Base64 transitant dans un champ conversationnel n’est pas démontrée fiable.

### C. UTF-8

Démontrée pour les deux SVG : les SHA Git réels sont exactement `b303b505...` et `c41dad92...`.

### D. Workflow temporaire isolé

Tenté avec onze fragments Base64 contrôlés. Le workflow devait reconstruire le PNG 512, vérifier les cinq fichiers puis committer les preuves. Aucun run n’a été créé après :

- un push par mise à jour directe de ref ;
- un second push direct ;
- un push par l’API GitHub Contents.

Le workflow et ses sources ont été supprimés.

### E. Git natif

Indisponible : pas d’authentification GitHub exploitable depuis le conteneur local.

## Contrôle à cinq niveaux

- SVG horizontal : démontré ;
- SVG small : démontré ;
- favicon 16 : démontré ;
- PNG 192 : blob exact existant, mais transfert courant non démontré ;
- PNG 512 : non démontré.

## Tests adversariaux

Tous détectés localement :

- changement d’un octet : offset 4 361 ;
- troncature de 37 octets : offset 8 685 ;
- PNG remplacé par du texte Base64 : offset 0 ;
- placeholder ;
- taille déclarée incorrecte ;
- SHA Git déclaré incorrect ;
- conversion CRLF : +68 octets, offset 38 ;
- BOM ajouté : +3 octets, offset 0 ;
- MIME incompatible avec la signature.

## Méthodes fiables dans le périmètre démontré

- UTF-8 pour les SVG, avec taille, SHA-256 et SHA Git contrôlés ;
- Base64 API pour un petit PNG, avec rejet immédiat si le SHA Git retourné diffère ;
- comparaison du SHA Git retourné avant tout rattachement à un tree.

## Limites et recommandation

Le lecteur de blobs binaires du connecteur échoue en tentant un décodage UTF-8. Le workflow ne se déclenche pas avec les mutations disponibles. La grande chaîne Base64 n’est pas préservée de façon reproductible.

Pour les actifs officiels, utiliser un programme ou Git natif authentifié qui lit directement les octets, calcule `git hash-object`, pousse, relit avec `git cat-file` et compare un checkout frais.

Règle obligatoire : **ne rattacher aucun blob à un tree tant que le SHA Git retourné n’est pas strictement égal au SHA Git théorique.**

## Nettoyage

- workflow et sources temporaires supprimés ;
- aucune PR ;
- aucun label ;
- aucune fusion ;
- aucun changement de `main` ;
- aucun changement de `product-realign-01b-home-final` ;
- aucun fichier dans la PR #25.

Un effet externe non sollicité a été observé : Vercel a créé automatiquement une Preview de la branche expérimentale. Aucun déploiement de production n’a été demandé et le connecteur disponible ne fournit pas d’action d’annulation.

## Verdict

**Intégrité binaire non démontrable avec l’environnement actuel.**
