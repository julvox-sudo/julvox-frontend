# Julvox Frontend — Fonctionnalités prioritaires

> Référentiel des fonctionnalités à réaliser avant les évolutions de long terme.
>
> Priorités : `P0` indispensable au fonctionnement fiable, `P1` indispensable à une première version publique solide, `P2` amélioration importante après stabilisation.

## Règles de priorisation

Une fonctionnalité est prioritaire lorsqu'elle réduit directement un risque utilisateur, un risque métier, une dette bloquante ou une incohérence entre la promesse Julvox et l'expérience réellement disponible.

Chaque fonctionnalité doit disposer avant développement de :

- son objectif utilisateur ;
- son périmètre exact ;
- ses états visuels ;
- ses erreurs ;
- ses dépendances backend ;
- ses critères d'acceptation ;
- ses exigences d'accessibilité ;
- ses tests ;
- sa stratégie de déploiement et de retour arrière.

## P0 — Stabilisation immédiate

### FP001 — Séparer données de démonstration et données réelles

**Objectif**

Garantir qu'aucune offre fictive, statistique simulée, minuterie artificielle ou score local ne soit présentée comme une donnée factuelle de production.

**Exigences**

- identifier toutes les données statiques de démonstration ;
- étiqueter explicitement les environnements de démonstration ;
- supprimer les fallbacks trompeurs en production ;
- conserver uniquement des états vides honnêtes lorsque l'API ne répond pas ;
- empêcher les données de démonstration d'alimenter analytics, SEO, alertes ou partage ;
- tester le comportement avec API vide, API en erreur et données partielles.

**Critères d'acceptation**

- aucune offre fictive sur le domaine public ;
- aucune minuterie non reliée à une date d'expiration réelle ;
- aucune statistique inventée ;
- distinction visuelle évidente dans un environnement de démonstration.

### FP002 — Contrat unifié des erreurs API

**Objectif**

Afficher une réponse cohérente et actionnable pour chaque type d'échec.

**États à distinguer**

- hors ligne ;
- délai dépassé ;
- serveur indisponible ;
- réponse invalide ;
- accès refusé ;
- limite atteinte ;
- ressource inexistante ;
- résultat vide valide ;
- erreur inconnue.

**Interface**

- message principal compréhensible ;
- cause utile sans détail technique sensible ;
- action de nouvelle tentative ;
- action secondaire adaptée ;
- identifiant de diagnostic lorsque fourni ;
- annonce accessible de l'erreur.

### FP003 — États de chargement cohérents

**Exigences**

- squelette pour les listes et cartes ;
- indicateur compact pour les actions locales ;
- blocage des doubles soumissions ;
- conservation du contenu précédent pendant une actualisation non destructive ;
- indication d'actualisation en arrière-plan ;
- durée minimale évitant le scintillement ;
- délai maximal déclenchant une aide ou une erreur.

### FP004 — Audit de sécurité DOM

**Périmètre**

- toutes les utilisations de `innerHTML` ;
- données API ;
- données RSS ;
- paramètres d'URL ;
- liens affiliés ;
- noms de produits et marchands ;
- messages dynamiques ;
- images et URLs externes.

**Exigences**

- échappement centralisé ;
- validation stricte des schémas d'URL ;
- refus de `javascript:`, `data:` non autorisé et protocoles inconnus ;
- `noopener noreferrer` pour les nouvelles fenêtres ;
- politique CSP compatible et restrictive ;
- tests de charges malveillantes.

### FP005 — Accessibilité clavier complète

**Parcours obligatoires**

- recherche ;
- catégories ;
- tri ;
- filtres ;
- cartes d'offres ;
- changement de thème ;
- navigation principale ;
- modales ;
- notifications ;
- installation PWA.

**Critères**

- ordre de tabulation logique ;
- focus toujours visible ;
- aucun piège clavier ;
- activation par Entrée ou Espace selon le contrôle ;
- retour du focus après fermeture d'une modale ;
- liens d'évitement ;
- libellés accessibles explicites.

### FP006 — Réduction des animations

**Exigences**

- prise en compte de `prefers-reduced-motion` ;
- arrêt ou simplification du ticker ;
- suppression des translations et animations non essentielles ;
- conservation des changements d'état compréhensibles ;
- aucune information transmise uniquement par animation.

### FP007 — Cohérence de version et de déploiement

**Exigences**

- une source unique de version ;
- affichage diagnostic non intrusif ;
- validation automatique entre fichiers ;
- contrôle post-déploiement ;
- détection d'un frontend ancien face à une API incompatible ;
- message de rafraîchissement lorsque nécessaire.

### FP008 — Suppression des fichiers obsolètes

**Actions**

- supprimer l'ancienne vérification Google signalée dans le README ;
- supprimer les ressources non référencées ;
- documenter toute exception ;
- vérifier l'absence de dépendance SEO avant suppression.

## P1 — Expérience produit essentielle

### FP101 — Recherche réellement exploitable

**Fonctions**

- saisie avec temporisation ;
- soumission explicite ;
- effacement ;
- historique local facultatif ;
- suggestions ;
- correction orthographique signalée ;
- recherche par nom, marque, catégorie, référence et marchand ;
- synchronisation dans l'URL ;
- partage d'une recherche ;
- restauration après retour arrière.

**États**

- initial ;
- saisie ;
- suggestions ;
- chargement ;
- résultats ;
- aucun résultat ;
- erreur ;
- hors ligne.

### FP102 — Filtres avancés

**Critères initiaux**

- catégorie ;
- marchand ;
- prix minimal et maximal ;
- pourcentage de réduction ;
- score de confiance ;
- disponibilité ;
- état du produit ;
- canal de vente ;
- livraison ;
- pays de destination ;
- frais inclus ou inconnus ;
- source ;
- date de détection.

**Comportements**

- compteur de filtres actifs ;
- suppression individuelle ;
- réinitialisation globale ;
- affichage mobile en panneau ;
- application différée ou immédiate clairement définie ;
- URL partageable ;
- valeurs incompatibles signalées.

### FP103 — Tri fiable

**Options**

- pertinence ;
- prix total croissant ;
- prix total décroissant ;
- réduction ;
- score de confiance ;
- nouveauté ;
- popularité ;
- délai de livraison.

**Contraintes**

- ne pas trier un prix incomplet comme un total fiable ;
- indiquer la base de classement ;
- conserver le tri dans l'URL ;
- stabilité du tri à valeur égale.

### FP104 — Fiche détaillée d'une offre

**Sections**

- identité du produit ;
- image et galerie ;
- prix article ;
- livraison ;
- frais obligatoires ;
- fiscalité ;
- prix total ;
- disponibilité ;
- état ;
- vendeur ;
- source ;
- date d'observation ;
- date d'acquisition ;
- score et justification ;
- historique ;
- offres alternatives ;
- avertissements ;
- bouton vers le marchand.

**Règles**

- distinguer inconnu de zéro ;
- distinguer prix article et total payable ;
- ne jamais masquer une fiscalité inconnue ;
- signaler une information ancienne ;
- afficher la provenance.

### FP105 — Fiche produit canonique

**Sections**

- nom ;
- marque ;
- catégorie ;
- identifiants ;
- caractéristiques ;
- variantes ;
- médias ;
- résumé ;
- offres actives ;
- historique de prix ;
- comparaison ;
- alertes ;
- recommandation Julvox.

**Cas limites**

- produit sans GTIN ;
- variantes ambiguës ;
- offres de produits reconditionnés ;
- images absentes ;
- spécifications contradictoires ;
- produit retiré.

### FP106 — Comparateur multi-offres et multi-produits

**Fonctions**

- ajouter depuis une carte ou une fiche ;
- retirer ;
- réordonner ;
- comparer deux à quatre éléments sur mobile ;
- davantage sur écran large ;
- différences uniquement ;
- valeurs manquantes ;
- mise en évidence du meilleur prix total ;
- mise en évidence du meilleur compromis ;
- partage par URL ;
- impression accessible.

**Critères de confiance**

- expliquer chaque avantage ;
- ne pas comparer des variantes incompatibles sans avertissement ;
- signaler les critères absents ;
- conserver la provenance de chaque valeur.

### FP107 — Favoris

**Fonctions**

- ajouter et retirer ;
- confirmation immédiate ;
- synchronisation locale puis serveur ;
- déduplication ;
- classement ;
- recherche dans les favoris ;
- regroupement par liste ;
- état indisponible ;
- suppression en masse ;
- export.

### FP108 — Alertes de prix

**Création**

- depuis une offre, un produit ou une recherche ;
- seuil absolu ;
- seuil de réduction ;
- prix total uniquement ;
- choix de l'état du produit ;
- marchands inclus ou exclus ;
- canal ;
- pays de destination ;
- fréquence ;
- canal de notification.

**Gestion**

- activer ;
- suspendre ;
- modifier ;
- supprimer ;
- historique de déclenchement ;
- éviter les doublons ;
- indiquer la dernière vérification.

### FP109 — Historique de prix

**Affichage**

- courbe ;
- tableau accessible ;
- médiane ;
- plus bas connu ;
- fenêtre temporelle ;
- nombre d'observations ;
- nombre de sources indépendantes ;
- ruptures de série ;
- données insuffisantes.

**Règles**

- ne pas relier artificiellement des variantes ;
- afficher la devise ;
- expliquer les trous ;
- distinguer prix total et prix article ;
- ne pas présenter une moyenne comme une médiane.

### FP110 — Compte utilisateur

**Fonctions**

- inscription ;
- connexion ;
- déconnexion ;
- vérification d'adresse ;
- mot de passe oublié ;
- modification du profil ;
- préférences ;
- sessions ;
- suppression ;
- export ;
- consentements.

**États de sécurité**

- session expirée ;
- compte suspendu ;
- adresse non vérifiée ;
- opération sensible à reconfirmer ;
- conflit de synchronisation.

### FP111 — Notifications

**Canaux**

- centre interne ;
- push PWA ;
- courriel géré par le backend ;
- préférence par type.

**Comportements**

- non lu ;
- lu ;
- marquer tout comme lu ;
- lien vers le contexte ;
- date relative et date absolue ;
- regroupement ;
- déduplication ;
- permission navigateur expliquée avant demande.

### FP112 — Explications Julvox

**Objectif**

Transformer le score ou la recommandation en décision compréhensible.

**Contenu minimal**

- pourquoi l'offre est intéressante ou non ;
- éléments favorables ;
- incertitudes ;
- prix de référence ;
- qualité du marchand ;
- disponibilité ;
- frais ;
- fraîcheur ;
- provenance ;
- absence de garantie lorsque les données sont insuffisantes.

### FP113 — Responsive complet

**Paliers**

- petit mobile ;
- mobile ;
- tablette ;
- ordinateur ;
- grand écran.

**Critères**

- aucune action essentielle inaccessible ;
- aucune information critique uniquement au survol ;
- tableaux transformés sans perte ;
- panneaux et modales adaptés ;
- zones tactiles suffisantes ;
- orientation paysage testée.

### FP114 — PWA robuste

**Exigences**

- installation guidée ;
- mise à jour contrôlée ;
- page hors ligne ;
- cache versionné ;
- purge ;
- distinction données périmées et données fraîches ;
- reprise des actions en attente lorsque sûr ;
- aucune offre périmée présentée comme actuelle sans avertissement.

### FP115 — Analytics respectueux de la vie privée

**Événements essentiels**

- recherche ;
- filtre ;
- tri ;
- ouverture d'une offre ;
- clic marchand ;
- ajout comparateur ;
- ajout favori ;
- création d'alerte ;
- erreur visible ;
- installation PWA.

**Contraintes**

- consentement lorsque requis ;
- minimisation ;
- aucune donnée sensible en clair ;
- noms d'événements versionnés ;
- exclusion des robots et démonstrations autant que possible.

## P2 — Consolidation après première version stable

### FP201 — Internationalisation

- catalogues de traduction ;
- formatage locale ;
- pluriels ;
- dates ;
- devises sans conversion implicite ;
- contenu SEO localisé ;
- sélection et persistance de langue ;
- routes localisées si retenues.

### FP202 — Personnalisation de l'accueil

- catégories favorites ;
- budget ;
- marchands préférés ;
- exclusions ;
- historique contrôlable ;
- recommandations explicables ;
- possibilité de désactiver la personnalisation.

### FP203 — Listes partagées

- création de listes ;
- invitation ;
- droits lecture/édition ;
- lien public révocable ;
- commentaires ;
- activité ;
- gestion des conflits.

### FP204 — Export et impression

- comparaison PDF ;
- CSV de favoris ;
- export des alertes ;
- impression simplifiée ;
- métadonnées de provenance ;
- date de génération ;
- avertissement sur la volatilité des prix.

### FP205 — Observabilité frontend

- erreurs JavaScript ;
- performance réelle ;
- taux d'échec API ;
- version du build ;
- navigateur ;
- traces corrélées ;
- masquage des données personnelles ;
- tableau de qualité par version.

## Définition de terminé

Une fonctionnalité prioritaire n'est terminée que lorsque :

- le comportement est implémenté ;
- les cas d'erreur sont couverts ;
- les tests sont verts ;
- l'accessibilité est vérifiée ;
- la documentation actuelle est mise à jour ;
- la version déployée est validée ;
- aucun fallback trompeur n'est actif ;
- la PR est fusionnée et le workflow `main` est vert.
