# Julvox Frontend — Architecture de référence

> Ce document définit les règles d'architecture destinées à préserver la cohérence du frontend pendant sa transformation progressive.
>
> Il ne décrit pas seulement l'état actuel. Il fixe les contraintes que les futurs développements devront respecter.

## 1. Principes directeurs

### A001 — Séparation des responsabilités

Le frontend doit distinguer clairement :

- présentation ;
- navigation ;
- état d'interface ;
- appels réseau ;
- normalisation des réponses ;
- règles de formatage ;
- persistance locale ;
- analytics ;
- observabilité ;
- configuration ;
- feature flags.

Une vue ne doit pas devenir la source de vérité d'une règle métier critique.

### A002 — Backend source de vérité

Le frontend peut :

- afficher ;
- filtrer ;
- trier selon un contrat reçu ;
- conserver un état temporaire ;
- calculer une présentation dérivée non critique.

Le frontend ne doit pas décider seul :

- de la fiabilité d'un marchand ;
- de la validité d'une offre ;
- d'un score de confiance factuel ;
- du prix total lorsqu'un composant manque ;
- de la fusion de produits ;
- de la résolution d'une contradiction ;
- de l'éligibilité finale à une alerte ;
- d'une autorisation sensible.

### A003 — Transparence des données

Toute donnée sensible pour la décision d'achat doit pouvoir exposer :

- sa valeur ;
- son unité ;
- sa provenance ;
- sa date d'observation ;
- sa date d'acquisition lorsque utile ;
- son périmètre ;
- son état de complétude ;
- ses incertitudes ;
- ses contradictions éventuelles.

### A004 — États explicites

Chaque écran ou composant asynchrone doit distinguer au minimum :

- initial ;
- chargement initial ;
- succès avec données ;
- succès vide ;
- actualisation ;
- erreur récupérable ;
- erreur bloquante ;
- hors ligne ;
- données périmées ;
- accès refusé.

Un tableau vide ne doit jamais servir à représenter indistinctement tous ces cas.

## 2. Structure cible

```text
src/
├── app/
│   ├── bootstrap/
│   ├── routing/
│   ├── providers/
│   └── configuration/
├── pages/
├── features/
│   ├── search/
│   ├── catalog/
│   ├── offers/
│   ├── comparison/
│   ├── favorites/
│   ├── alerts/
│   ├── account/
│   ├── notifications/
│   └── decisions/
├── entities/
│   ├── product/
│   ├── offer/
│   ├── merchant/
│   ├── user/
│   └── observation/
├── shared/
│   ├── api/
│   ├── ui/
│   ├── forms/
│   ├── accessibility/
│   ├── analytics/
│   ├── errors/
│   ├── formatting/
│   ├── storage/
│   ├── security/
│   └── testing/
└── assets/
```

Cette structure est une cible. La migration doit être incrémentale, sans réécriture globale risquée.

## 3. Dépendances autorisées

### A101 — Direction des dépendances

```text
app
→ pages
→ features
→ entities
→ shared
```

Règles :

- `shared` ne dépend d'aucune feature ;
- une entité ne dépend pas d'une page ;
- une feature ne doit pas importer directement l'intérieur privé d'une autre feature ;
- les échanges entre domaines utilisent des interfaces publiques ;
- les composants visuels génériques ne connaissent pas les appels API métier.

### A102 — API publique d'un module

Chaque module doit exposer un point d'entrée explicite.

Exemple conceptuel :

```text
features/comparison/
├── index
├── ui/
├── model/
├── api/
├── lib/
└── tests/
```

Les consommateurs importent depuis `index`, pas depuis un fichier interne arbitraire.

## 4. Navigation

### A201 — Routes stables

Les routes doivent être :

- lisibles ;
- partageables ;
- compatibles avec le retour arrière ;
- restaurables après rafraîchissement ;
- indépendantes d'un état mémoire éphémère.

### A202 — Paramètres d'URL

Doivent être représentables dans l'URL lorsqu'ils déterminent le contenu :

- requête ;
- catégorie ;
- filtres ;
- tri ;
- pagination ;
- comparaison ;
- onglet significatif ;
- identifiant produit ou offre.

Ne doivent pas apparaître dans l'URL :

- jetons ;
- secrets ;
- données personnelles sensibles ;
- contenu complet d'un panier privé ;
- détails internes d'erreur.

### A203 — Liens profonds

Un lien profond doit fonctionner :

- depuis une nouvelle session ;
- après authentification lorsque nécessaire ;
- sur mobile ;
- depuis une notification ;
- depuis une PWA installée ;
- après changement de version compatible.

## 5. Gestion d'état

### A301 — Catégories d'état

- état serveur : données provenant de l'API ;
- état URL : recherche, filtres, tri, page ;
- état local persistant : thème, consentements, préférences non sensibles ;
- état de session : panneau ouvert, sélection temporaire ;
- état de formulaire : valeurs, erreurs, soumission.

Ces catégories ne doivent pas être mélangées sans raison.

### A302 — État serveur

Exigences :

- clés de cache déterministes ;
- invalidation explicite ;
- déduplication des requêtes ;
- annulation lorsque possible ;
- conservation contrôlée du contenu précédent ;
- distinction fraîcheur et disponibilité ;
- prévention des réponses hors ordre.

### A303 — Persistance locale

Peuvent être persistés avec prudence :

- thème ;
- langue ;
- consentements ;
- préférences d'affichage ;
- brouillons non sensibles ;
- cache PWA versionné.

Ne doivent pas être persistés en clair :

- mot de passe ;
- jeton longue durée si une alternative sécurisée existe ;
- données bancaires ;
- secrets ;
- informations personnelles inutiles ;
- réponse complète d'une API privée sans politique de rétention.

## 6. Couche API

### A401 — Client centralisé

Le frontend doit utiliser un client réseau centralisant :

- URL de base ;
- version API ;
- en-têtes ;
- authentification ;
- délais ;
- annulation ;
- corrélation ;
- parsing ;
- erreurs ;
- politique de nouvelle tentative ;
- observabilité.

### A402 — Validation des réponses

Une réponse reçue ne doit pas être utilisée aveuglément.

Le client ou l'adaptateur doit vérifier :

- type global ;
- champs obligatoires ;
- nombres finis ;
- dates valides ;
- énumérations connues ;
- URLs autorisées ;
- cohérence minimale des montants ;
- version de schéma.

### A403 — Erreurs normalisées

Contrat frontend recommandé :

```text
AppError
- code
- category
- userMessage
- retryable
- field
- correlationId
- technicalCause
```

Le message technique ne doit pas être exposé directement à l'utilisateur.

### A404 — Nouvelle tentative

Autoriser uniquement lorsque l'opération est sûre :

- lecture idempotente ;
- mutation dotée d'une clé d'idempotence ;
- échec transitoire identifié.

Ne pas relancer automatiquement :

- erreur de validation ;
- accès refusé ;
- opération potentiellement dupliquée sans protection ;
- ressource inexistante durablement.

## 7. Modèles de données frontend

### A501 — Montants

Représentation recommandée :

```text
Money
- amountMinor: integer
- currency: ISO 4217
```

Règles :

- pas de flottant pour les calculs monétaires ;
- `0` signifie zéro réel ;
- `null` signifie inconnu ;
- aucun formatage avant la couche de présentation ;
- aucune conversion de devise implicite.

### A502 — Prix d'offre

Distinguer :

- prix article ;
- livraison ;
- frais obligatoires ;
- total payable ;
- statut de complétude ;
- statut fiscal ;
- devise.

Le frontend ne doit pas afficher un total incomplet comme un total certain.

### A503 — Dates

- recevoir et conserver des instants avec fuseau ;
- normaliser selon le contrat API ;
- formater selon la locale utilisateur ;
- offrir une date absolue pour les lecteurs d'écran ou au survol d'une date relative ;
- ne jamais inventer l'heure locale de la source.

### A504 — Identifiants

- traiter les identifiants comme opaques ;
- ne pas déduire leur nature depuis leur format ;
- ne pas fusionner deux entités parce que leurs noms se ressemblent ;
- encoder correctement dans les URLs ;
- ne pas exposer un identifiant sensible inutilement.

## 8. Composants UI

### A601 — Design system

Le design system doit couvrir :

- couleurs ;
- typographie ;
- espacements ;
- rayons ;
- ombres ;
- grilles ;
- icônes ;
- mouvements ;
- états ;
- niveaux de priorité ;
- thèmes ;
- densité.

### A602 — Composants fondamentaux

- Button ;
- IconButton ;
- Link ;
- Input ;
- SearchField ;
- Select ;
- Checkbox ;
- Radio ;
- Switch ;
- Slider ;
- FormField ;
- Alert ;
- Toast ;
- Modal ;
- Drawer ;
- Popover ;
- Tooltip ;
- Tabs ;
- Breadcrumb ;
- Pagination ;
- Skeleton ;
- EmptyState ;
- ErrorState ;
- Price ;
- Badge ;
- Card ;
- DataTable ;
- AccessibleChart.

### A603 — Variantes d'état

Tout composant interactif doit définir :

- par défaut ;
- survol ;
- focus ;
- actif ;
- sélectionné ;
- désactivé ;
- chargement ;
- erreur ;
- succès lorsque pertinent.

### A604 — Boutons

Règles :

- un libellé décrit l'action ;
- un bouton d'icône possède un nom accessible ;
- une action destructive demande confirmation proportionnée ;
- le chargement ne modifie pas brutalement la largeur ;
- un bouton désactivé ne constitue pas l'unique explication d'une impossibilité.

## 9. Formulaires

### A701 — Validation

- validation locale rapide pour la forme ;
- validation serveur comme autorité ;
- erreurs au niveau du champ ;
- résumé global lorsque plusieurs erreurs ;
- conservation de la saisie ;
- déplacement du focus vers la première erreur ;
- annonce accessible.

### A702 — Soumission

- prévention des doubles clics ;
- indication en cours ;
- idempotence lorsque nécessaire ;
- reprise après erreur ;
- protection contre la perte de données ;
- confirmation explicite en cas de succès non évident.

### A703 — Valeurs sensibles

- aucun journal de mot de passe ;
- contrôle de l'autocomplétion ;
- affichage/masquage accessible ;
- effacement après usage selon le besoin ;
- aucune persistance locale accidentelle.

## 10. Accessibilité

### A801 — Niveau cible

Le frontend vise au minimum WCAG 2.2 AA.

### A802 — Exigences globales

- HTML sémantique ;
- navigation clavier ;
- focus visible ;
- ordre logique ;
- contrastes ;
- zoom 200 % ;
- reflow ;
- textes alternatifs ;
- noms accessibles ;
- erreurs annoncées ;
- réduction des animations ;
- zones tactiles suffisantes ;
- alternatives aux graphiques.

### A803 — Modales

- titre associé ;
- focus initial logique ;
- piège de focus limité à la modale ;
- fermeture par Échap lorsque sûre ;
- retour du focus ;
- fond non navigable ;
- action destructive clairement nommée.

### A804 — Données visuelles

Les couleurs, badges, graphiques et scores doivent proposer une alternative textuelle.

## 11. Responsive

### A901 — Mobile first

La fonctionnalité essentielle doit être disponible sur petit écran avant d'ajouter des enrichissements desktop.

### A902 — Points de rupture

Les points de rupture doivent répondre au contenu, pas seulement à un appareil théorique.

Tester au minimum :

- 320 px ;
- 375 px ;
- 768 px ;
- 1024 px ;
- 1440 px ;
- orientation paysage.

### A903 — Tableaux et comparaisons

Stratégies autorisées :

- défilement horizontal annoncé ;
- colonnes épinglées ;
- cartes empilées ;
- choix de critères ;
- vue différences uniquement.

Aucune donnée critique ne doit disparaître sans possibilité d'accès.

## 12. Performance

### A1001 — Budgets

Définir et suivre :

- poids HTML initial ;
- poids JavaScript ;
- poids CSS ;
- nombre de requêtes ;
- taille des images ;
- LCP ;
- CLS ;
- INP ;
- temps de démarrage PWA.

### A1002 — Images

- dimensions déclarées ;
- formats modernes ;
- `srcset` lorsque utile ;
- chargement différé hors premier écran ;
- placeholder ;
- fallback ;
- limitation des domaines ;
- texte alternatif pertinent.

### A1003 — Listes longues

- pagination ou chargement progressif ;
- virtualisation si justifiée ;
- conservation de la position ;
- annulation des requêtes précédentes ;
- clés stables ;
- absence de recalcul global inutile.

### A1004 — Tâches périodiques

- suspendre lorsque l'onglet est masqué ;
- fréquence configurable ;
- arrêt lors du démontage ;
- absence de doublon ;
- backoff en cas d'erreur ;
- respect du mode économie de données.

## 13. PWA et hors ligne

### A1101 — Stratégies de cache

Définir séparément :

- shell applicatif ;
- ressources versionnées ;
- images ;
- réponses API publiques ;
- données privées ;
- pages hors ligne.

### A1102 — Données privées

Ne pas mettre en cache public ou partagé :

- profil ;
- alertes ;
- historique privé ;
- notifications ;
- jetons ;
- réponses personnalisées.

### A1103 — Fraîcheur

Toute donnée de prix affichée hors ligne doit indiquer :

- qu'elle provient du cache ;
- sa date ;
- son éventuelle obsolescence ;
- qu'une nouvelle vérification est nécessaire avant achat.

### A1104 — Mise à jour du service worker

- détecter une nouvelle version ;
- ne pas interrompre une action en cours ;
- proposer un rafraîchissement ;
- permettre un déploiement urgent ;
- purger les caches incompatibles.

## 14. Sécurité

### A1201 — Injection

- ne pas injecter de chaîne non fiable avec `innerHTML` ;
- utiliser des APIs DOM sûres ou un moteur avec échappement par défaut ;
- assainir uniquement avec une bibliothèque reconnue lorsque du HTML riche est nécessaire ;
- tester les charges XSS.

### A1202 — URLs

- autoriser seulement `https:` et cas explicitement nécessaires ;
- normaliser ;
- refuser les identifiants intégrés ;
- protéger les ouvertures externes ;
- ne pas refléter une URL utilisateur sans validation.

### A1203 — Authentification

- préférer des cookies sécurisés gérés par le backend lorsque l'architecture le permet ;
- ne pas exposer de secret dans le bundle ;
- traiter l'expiration ;
- protéger les actions sensibles ;
- ne jamais confondre masquage UI et autorisation.

### A1204 — Configuration

Les variables publiques de build ne doivent contenir aucun secret.

### A1205 — En-têtes

Maintenir :

- CSP ;
- HSTS ;
- Referrer-Policy ;
- Permissions-Policy ;
- protection contre le sniffing ;
- politique d'encadrement ;
- cache adapté aux ressources.

## 15. Confidentialité

### A1301 — Minimisation

Collecter uniquement ce qui est nécessaire à une finalité expliquée.

### A1302 — Consentement

- demande avant activation lorsque requise ;
- granularité ;
- refus aussi simple que l'acceptation ;
- retrait ;
- preuve ;
- version de la politique.

### A1303 — Analytics

Ne jamais envoyer :

- mots de passe ;
- jetons ;
- contenu privé complet ;
- adresse précise sans nécessité ;
- paramètres d'URL sensibles ;
- texte libre non filtré.

## 16. SEO

### A1401 — Métadonnées par page

Chaque page indexable doit définir :

- titre unique ;
- description ;
- canonique ;
- robots ;
- Open Graph ;
- carte sociale ;
- données structurées pertinentes.

### A1402 — Pages non indexables

Compte, alertes, favoris privés, administration et pages contenant des paramètres sensibles doivent être exclues de l'indexation.

### A1403 — Contenu rendu

Les pages importantes doivent rester accessibles aux moteurs selon la stratégie choisie. Une SPA pure peut nécessiter rendu statique, pré-rendu ou serveur pour les contenus publics stratégiques.

## 17. Internationalisation

### A1501 — Textes

Aucune chaîne métier durable ne doit rester dispersée dans les composants lorsque le support multilingue commence.

### A1502 — Formatage

Centraliser :

- nombres ;
- monnaies ;
- pourcentages ;
- dates ;
- durées ;
- pluriels ;
- listes.

### A1503 — Devises

Le formatage ne réalise aucune conversion. Une conversion doit provenir d'un service explicite avec taux, date et source.

## 18. Analytics

### A1601 — Schéma d'événements

Chaque événement possède :

- nom versionné ;
- déclencheur ;
- propriétés autorisées ;
- finalité ;
- niveau de consentement ;
- propriétaire ;
- durée de conservation.

### A1602 — Événements essentiels

- page vue ;
- recherche soumise ;
- filtre appliqué ;
- tri changé ;
- offre ouverte ;
- clic marchand ;
- comparaison modifiée ;
- favori modifié ;
- alerte créée ;
- erreur affichée ;
- installation PWA.

### A1603 — Qualité

- pas de double comptage ;
- pas d'événement avant consentement si requis ;
- pas de données de démonstration dans les métriques de production ;
- tests automatisés du schéma.

## 19. Observabilité

### A1701 — Erreurs frontend

Capturer :

- exception ;
- rejet de promesse ;
- erreur de ressource ;
- erreur API normalisée ;
- version ;
- route ;
- navigateur ;
- corrélation.

Masquer les données personnelles.

### A1702 — Mesures réelles

- Core Web Vitals ;
- durée des requêtes ;
- taux d'erreur ;
- cache ;
- fréquence des écrans vides ;
- abandon de formulaire ;
- version affectée.

## 20. Tests

### A1801 — Tests unitaires

Couvrir :

- formatage ;
- validation ;
- normalisation ;
- sélecteurs ;
- calculs de présentation ;
- sécurité des URLs ;
- gestion d'erreurs.

### A1802 — Tests de composants

Couvrir :

- états ;
- interactions ;
- clavier ;
- lecteur d'écran autant que possible ;
- responsive logique ;
- chargement ;
- erreur.

### A1803 — Tests d'intégration

Couvrir :

- recherche et filtres ;
- détail ;
- comparaison ;
- favoris ;
- alertes ;
- authentification ;
- notifications ;
- erreurs API.

### A1804 — Tests end-to-end

Parcours critiques :

1. rechercher un produit ;
2. filtrer ;
3. ouvrir une offre ;
4. comparer ;
5. créer une alerte ;
6. revenir par un lien profond ;
7. fonctionner après rafraîchissement ;
8. gérer une API indisponible.

### A1805 — Tests non fonctionnels

- accessibilité ;
- performance ;
- sécurité ;
- compatibilité navigateur ;
- PWA ;
- SEO ;
- responsive ;
- résilience réseau.

## 21. Déploiement

### A1901 — Environnements

- local ;
- preview par PR ;
- staging si retenu ;
- production.

Les données et services doivent être clairement séparés.

### A1902 — Preview Vercel

Chaque PR doit permettre de vérifier :

- interface ;
- responsive ;
- console ;
- réseau ;
- erreurs ;
- métadonnées ;
- PWA lorsque possible ;
- comportement avec backend cible.

### A1903 — Retour arrière

Toute livraison doit pouvoir être annulée rapidement sans migration frontend irréversible.

### A1904 — Validation post-déploiement

- page accessible ;
- version correcte ;
- API compatible ;
- recherche ;
- offre ;
- liens externes ;
- service worker ;
- erreurs ;
- workflow `main` vert.

## 22. Migration depuis l'architecture actuelle

### Phase 1 — Encadrement

- figer les comportements actuels ;
- ajouter tests de non-régression ;
- centraliser configuration, API et échappement ;
- retirer les données de démonstration trompeuses.

### Phase 2 — Extraction

- extraire les styles ;
- extraire les composants ;
- extraire les modules métier ;
- conserver les sélecteurs et contrats visibles lorsque nécessaire.

### Phase 3 — Routage et état

- introduire routes ;
- synchroniser recherche et filtres ;
- séparer état serveur et état local ;
- préserver les liens historiques.

### Phase 4 — Produit complet

- fiche produit ;
- fiche offre ;
- comparaison ;
- compte ;
- favoris ;
- alertes ;
- notifications ;
- décision expliquée.

## 23. Règles de Pull Request

Chaque PR frontend doit indiquer :

- fonctionnalités concernées ;
- comportement avant/après ;
- dépendances backend ;
- captures desktop et mobile ;
- tests ;
- accessibilité ;
- risques ;
- stratégie de rollback ;
- documentation mise à jour.

## 24. Définition de conformité architecturale

Une modification est conforme lorsqu'elle :

- respecte la direction des dépendances ;
- ne déplace pas une règle métier critique dans l'interface ;
- couvre tous les états nécessaires ;
- valide les données reçues ;
- n'expose pas de secret ;
- reste accessible ;
- respecte les budgets ;
- ajoute les tests appropriés ;
- met à jour le référentiel fonctionnel ;
- est validée sur preview puis sur `main`.
