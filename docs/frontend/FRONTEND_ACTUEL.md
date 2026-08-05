# Julvox Frontend — Fonctionnalités actuelles

> Source de vérité fonctionnelle du frontend actuellement présent dans le dépôt `julvox-sudo/julvox-frontend`.
>
> Statuts utilisés : `IMPLÉMENTÉ`, `PARTIEL`, `À CONFIRMER`, `ABSENT`.
>
> Une fonctionnalité n'est marquée `IMPLÉMENTÉ` que lorsqu'un comportement observable est présent dans le code audité. Les éléments non vérifiés restent explicitement signalés.

## 1. Périmètre audité

Le frontend actuel est une SPA statique déployée sur Vercel, structurée principalement autour de `index.html`, `enhancements_v3.js`, `sw.js`, `manifest.json`, `vercel.json` et des ressources PWA.

## F001 — Socle applicatif

### F001.001 Chargement de l'application — IMPLÉMENTÉ

**Objectif**

Afficher l'application Julvox/DealScan dans un navigateur moderne sans dépendre d'un framework client.

**Comportements actuels**

- chargement depuis un document HTML principal ;
- initialisation des styles, scripts et métadonnées dans la page ;
- application de la langue française au document ;
- thème sombre activé par défaut ;
- prise en charge de la zone sûre des appareils mobiles via `viewport-fit=cover` ;
- conservation d'une hauteur minimale égale à celle de la fenêtre ;
- espace inférieur réservé aux éléments de navigation fixes.

**États attendus**

- document en cours de chargement ;
- interface initialisée ;
- scripts complémentaires disponibles ;
- erreur de ressource non bloquante lorsque le fallback existe.

**Limites observées**

- architecture monolithique fortement concentrée dans `index.html` ;
- absence de découpage applicatif explicite par routes, composants et domaines ;
- stratégie de reprise globale à documenter.

### F001.002 Contrat de version frontend — IMPLÉMENTÉ

**Objectif**

Exposer une version de build identifiable par les outils d'exploitation et de diagnostic.

**Comportements actuels**

- présence d'une métadonnée `build-version` dans le document ;
- affichage d'une version produit dans le titre de page ;
- version exploitable par un script de contrôle ou une vérification post-déploiement.

**Critères de conformité**

- une seule version active doit être exposée ;
- la valeur doit changer à chaque livraison concernée ;
- la version affichée et la version technique ne doivent pas diverger silencieusement.

## F002 — Référencement et partage

### F002.001 Métadonnées SEO principales — IMPLÉMENTÉ

**Éléments présents**

- titre de page descriptif ;
- méta-description ;
- auteur ;
- directives d'indexation ;
- mots-clés ;
- URL canonique ;
- couleur de thème.

**Règles fonctionnelles**

- la page principale doit être indexable ;
- la description doit présenter l'analyse des offres, le score de confiance, les alertes et la comparaison ;
- l'URL canonique doit pointer vers le domaine officiel ;
- les métadonnées ne doivent pas annoncer une capacité indisponible sans signalement.

### F002.002 Open Graph — IMPLÉMENTÉ

**Comportements**

- génération d'un aperçu lors du partage sur les plateformes compatibles ;
- définition du titre, de la description, de l'image, de la locale et du nom du site ;
- image de partage basée sur l'icône principale Julvox.

**Cas limites**

- image indisponible ;
- cache social obsolète ;
- différence entre URL partagée et URL canonique ;
- texte tronqué par la plateforme destinataire.

### F002.003 Carte Twitter/X — IMPLÉMENTÉ

**Comportements**

- format `summary_large_image` ;
- titre et description dédiés ;
- image de partage ;
- compte de site déclaré.

### F002.004 Données structurées — IMPLÉMENTÉ

**Comportements**

- déclaration Schema.org de type `WebSite` ;
- déclaration de l'organisation éditrice ;
- définition d'une action de recherche ;
- exposition d'un point de contact.

**Contraintes**

- le modèle JSON-LD doit rester syntaxiquement valide ;
- les URLs exposées doivent être publiques et stables ;
- l'action de recherche doit correspondre au comportement réel de l'application.

## F003 — Thèmes et apparence

### F003.001 Thème sombre — IMPLÉMENTÉ

**Comportements**

- thème sombre appliqué par défaut ;
- palette dédiée au fond, aux cartes, aux bordures, aux textes et aux ombres ;
- conservation de la lisibilité des contenus prioritaires ;
- transitions visuelles lors d'un changement de thème.

### F003.002 Thème clair — IMPLÉMENTÉ

**Comportements**

- palette claire complète ;
- adaptation des surfaces, textes, bordures et ombres ;
- conservation de la couleur d'accent Julvox.

### F003.003 Commande de changement de thème — IMPLÉMENTÉ

**Interface**

- bouton d'icône dans la navigation supérieure ;
- retour visuel immédiat ;
- cible tactile adaptée à l'usage mobile.

**À confirmer**

- persistance du choix entre deux sessions ;
- synchronisation avec la préférence système ;
- annonce accessible du thème actif.

## F004 — Navigation principale

### F004.001 Barre supérieure fixe — IMPLÉMENTÉ

**Éléments**

- logo ;
- actions de navigation ;
- commande de thème ;
- fond translucide avec flou ;
- bordure séparatrice.

**Comportements**

- maintien en haut de la fenêtre pendant le défilement ;
- priorité d'affichage au-dessus du contenu ;
- adaptation aux interactions pointeur et tactile.

### F004.002 Logo et identité visuelle — IMPLÉMENTÉ

**Comportements**

- typographie de marque ;
- accent en dégradé ;
- présentation cohérente avec les couleurs principales de Julvox.

### F004.003 Navigation inférieure — PARTIEL

Le socle réserve de l'espace à une navigation inférieure fixe et les améliorations positionnent le ticker au-dessus de cette zone.

**À confirmer dans l'audit complet**

- nombre exact d'onglets ;
- libellés ;
- gestion de l'onglet actif ;
- navigation clavier ;
- restauration de l'état lors d'un retour arrière.

## F005 — Recherche

### F005.001 Barre de recherche principale — IMPLÉMENTÉ

**Interface**

- conteneur dédié sous la navigation ;
- icône de recherche ;
- champ texte ;
- texte indicatif ;
- mise en évidence au focus.

**Comportements**

- saisie libre ;
- focus visuel sur le conteneur ;
- largeur adaptable ;
- héritage du thème actif.

**Cas à couvrir dans la documentation d'exécution**

- recherche vide ;
- requête avec espaces ;
- caractères accentués ;
- caractères spéciaux ;
- requête très longue ;
- absence de résultat ;
- erreur réseau ;
- résultats partiels ;
- annulation et effacement.

### F005.002 Action de recherche structurée pour les moteurs — IMPLÉMENTÉ

La recherche est déclarée dans les données structurées avec un paramètre `q`.

**Contrainte**

Le frontend doit interpréter ce paramètre de manière cohérente pour éviter une promesse SEO non tenue.

## F006 — Accueil et synthèse

### F006.001 Zone d'introduction — IMPLÉMENTÉ

**Éléments**

- titre principal ;
- mise en valeur typographique ;
- statistiques synthétiques ;
- disposition compacte adaptée au premier écran.

### F006.002 Statistiques d'accueil — IMPLÉMENTÉ

**Présentation**

- valeur principale ;
- libellé secondaire ;
- cartes de synthèse ;
- adaptation à l'espace disponible.

**Règles attendues**

- ne jamais afficher une valeur non finie ;
- signaler explicitement les données indisponibles ;
- éviter une valeur de démonstration présentée comme donnée réelle.

## F007 — Catégories

### F007.001 Liste horizontale des catégories — IMPLÉMENTÉ

**Comportements**

- défilement horizontal ;
- masquage de la barre de défilement native ;
- éléments non compressés ;
- état actif ;
- effet au survol ;
- libellé et pictogramme possibles.

### F007.002 Catégories enrichies — IMPLÉMENTÉ

**Catégories actuellement référencées**

High-tech, alimentaire, restauration, mode, gaming, maison, voyages, sport, animaux, beauté, bricolage, jardin, automobile, informatique, santé, jouets et catégorie par défaut.

**Comportements associés**

- image de remplacement par catégorie ;
- usage lors de l'absence ou de l'échec d'une image d'offre ;
- maintien d'un visuel cohérent dans les cartes.

## F008 — Deals flash

### F008.001 Carrousel horizontal — IMPLÉMENTÉ

**Interface**

- cartes compactes ;
- image ;
- nom tronqué ;
- prix ;
- badge de réduction ;
- compteur ;
- défilement horizontal.

### F008.002 Chargement dynamique depuis l'API — IMPLÉMENTÉ

**Flux nominal**

1. appel du point d'accès des offres tendance ;
2. demande d'un maximum de huit résultats avec score minimal ;
3. filtrage des offres invalides ou sans prix positif ;
4. remplacement du contenu statique lorsqu'au moins trois offres sont disponibles ;
5. génération des cartes ;
6. démarrage des compteurs.

**Fallback**

En cas d'erreur, les offres flash statiques existantes sont conservées.

**Sécurité d'affichage**

- échappement des URLs, noms et valeurs textuelles injectées ;
- ouverture externe avec protection `noopener` ;
- remplacement de l'image lors d'un échec de chargement.

### F008.003 Compteurs d'expiration — IMPLÉMENTÉ

**Comportements**

- compteur au format heures, minutes et secondes ;
- décrémentation chaque seconde ;
- affichage `Expiré` à zéro ;
- arrêt de l'intervalle arrivé à expiration.

**Limite actuelle**

La durée semble construite côté client et n'est pas encore liée à une date d'expiration métier garantie.

## F009 — Liste et grille d'offres

### F009.001 Grille responsive — IMPLÉMENTÉ

**Comportements**

- colonnes automatiques selon la largeur ;
- largeur minimale adaptée au mobile ;
- cartes plus larges à partir du seuil tablette ;
- espacements adaptatifs.

### F009.002 Carte d'offre — IMPLÉMENTÉ

**Éléments observés ou structurés**

- image ;
- nom ;
- prix ;
- remise ;
- marchand ;
- score ou indicateur de confiance ;
- lien externe ;
- états de survol ;
- surfaces et bordures thématiques.

**Comportements**

- translation légère au survol ;
- ombre renforcée ;
- mise en évidence de la bordure ;
- image avec fallback par catégorie ;
- lien vers la source ou l'URL affiliée lorsqu'elle existe.

## F010 — Tri et filtrage

### F010.001 Barre de tri horizontale — IMPLÉMENTÉ

**Comportements**

- boutons en défilement horizontal ;
- état actif ;
- état de survol ;
- libellés non coupés ;
- couleur d'accent sur le choix actif.

### F010.002 Filtrage par source — IMPLÉMENTÉ

**Sources représentables**

Dealabs, Amazon, Fnac et autres marchands ou flux exposés par les données.

**Règles attendues**

- le filtre actif doit être visible ;
- le résultat doit être recalculé sans dupliquer les cartes ;
- un état vide doit distinguer l'absence de données d'une erreur de chargement.

## F011 — Actualisation et temps réel

### F011.001 Actualisation automatique — IMPLÉMENTÉ

**Comportement déclaré**

- rafraîchissement automatique toutes les trente secondes ;
- badge animé indiquant l'activité ;
- mise à jour des contenus concernés sans rechargement complet de la page.

**Contraintes fonctionnelles**

- éviter les requêtes concurrentes ;
- suspendre ou réduire l'activité lorsque l'onglet est masqué ;
- conserver la sélection et la position de défilement ;
- ne pas remplacer une donnée plus récente par une réponse ancienne.

### F011.002 Bandeau de nouveau deal — IMPLÉMENTÉ

**Comportements attendus selon le module**

- détection d'une nouvelle offre ;
- affichage animé ;
- information concise ;
- disparition contrôlée ;
- absence de blocage de la navigation.

### F011.003 Ticker d'offres en direct — IMPLÉMENTÉ SUR ÉCRAN LARGE

**Flux nominal**

1. non-initialisation sous 768 px ;
2. création dynamique du conteneur ;
3. chargement d'offres tendance depuis l'API ;
4. affichage de douze éléments maximum ;
5. animation continue ;
6. actualisation toutes les soixante secondes.

**Éléments par item**

- remise ou pictogramme ;
- nom tronqué ;
- prix ;
- marchand ;
- lien externe sécurisé.

**Interactions**

- animation mise en pause au survol ;
- éléments cliquables malgré un conteneur global non interactif ;
- absence de fallback de démonstration si l'API ne renvoie rien.

## F012 — Marchands et confiance

### F012.001 Référentiel local de confiance marchand — IMPLÉMENTÉ

**Comportement**

- association d'un marchand connu à un score numérique ;
- enrichissement de la liste principale par un dictionnaire étendu ;
- usage potentiel dans l'affichage et le classement.

**Marchands couverts**

Le référentiel inclut notamment Amazon, Fnac, Darty, Boulanger, Cdiscount, Zalando, Nike, Carrefour, IKEA, Decathlon, Rakuten, AliExpress, LDLC, SNCF Connect, Booking.com, Nintendo et de nombreux autres.

**Limite majeure**

Ces scores sont actuellement définis dans le frontend. Ils ne doivent pas être considérés comme une source factuelle auditable tant qu'ils ne sont pas produits et justifiés par le backend.

## F013 — PWA

### F013.001 Manifeste d'application — IMPLÉMENTÉ

**Capacités**

- installation sur appareil compatible ;
- nom et identité de l'application ;
- icônes principales ;
- raccourcis vers deals, flash, promotions et alertes ;
- couleur de thème.

### F013.002 Service Worker — IMPLÉMENTÉ

**Capacités déclarées**

- cache hors ligne ;
- prise en charge des notifications push ;
- amélioration du démarrage et de la résilience réseau.

**Points à auditer séparément**

- stratégie cache-first ou network-first par ressource ;
- versionnement des caches ;
- purge des anciens caches ;
- comportement hors ligne des appels API ;
- mise à jour contrôlée du service worker.

### F013.003 Icônes et raccourcis — IMPLÉMENTÉ

**Ressources principales**

- icônes 192 et 512 px ;
- raccourci deals ;
- raccourci flash ;
- raccourci promotions ;
- raccourci alertes.

## F014 — Performance frontend

### F014.001 Préconnexion réseau — IMPLÉMENTÉ

**Comportements**

- préconnexion aux polices Google ;
- pré-résolution DNS et préconnexion au backend ;
- absence de préchargement lourd avant le document principal.

### F014.002 Chargement différé des images — IMPLÉMENTÉ DANS LES DEALS FLASH DYNAMIQUES

**Comportement**

- attribut `loading="lazy"` ;
- fallback d'image ;
- dimensions contraintes pour limiter les déplacements de mise en page.

### F014.003 Réduction du travail mobile — IMPLÉMENTÉ POUR LE TICKER

Sous 768 px, le ticker n'est ni créé ni alimenté, évitant le DOM, les requêtes et les intervalles inutiles.

## F015 — Sécurité côté client

### F015.001 Échappement des contenus injectés — PARTIEL

Les cartes dynamiques utilisent une fonction d'échappement pour les URLs et textes.

**Exigence de généralisation**

Toute donnée API, RSS, URL ou paramètre utilisateur injecté dans le DOM doit suivre le même contrat.

### F015.002 Liens externes sécurisés — IMPLÉMENTÉ

Les liens externes dynamiques sont ouverts dans un nouvel onglet avec `rel="noopener"`.

### F015.003 En-têtes de sécurité Vercel — IMPLÉMENTÉ À AUDITER

Le dépôt déclare des en-têtes de sécurité dans `vercel.json`.

**Audit détaillé requis**

- Content-Security-Policy ;
- HSTS ;
- Referrer-Policy ;
- Permissions-Policy ;
- protection contre l'intégration en iframe ;
- cohérence avec les sources d'images, polices et API utilisées.

## F016 — Accessibilité

### F016.001 Navigation clavier — PARTIEL / À CONFIRMER

Les contrôles utilisent des éléments interactifs natifs dans plusieurs zones, mais l'audit complet des parcours clavier reste à réaliser.

### F016.002 Focus visible — PARTIEL

Le champ de recherche possède un état de focus perceptible. Les autres composants doivent être audités systématiquement.

### F016.003 Textes alternatifs d'images — IMPLÉMENTÉ DANS LES CARTES FLASH DYNAMIQUES

Le nom de l'offre est utilisé comme texte alternatif.

### F016.004 Réduction des animations — ABSENT OU NON VÉRIFIÉ

Aucun contrat global `prefers-reduced-motion` n'a encore été confirmé.

## F017 — Internationalisation

### F017.001 Interface française — IMPLÉMENTÉ

- langue du document définie en français ;
- textes et métadonnées en français ;
- devise affichée en euro dans les composants audités.

### F017.002 Support multilingue — ABSENT OU NON VÉRIFIÉ

Aucune architecture de traduction, catalogue de messages ou sélection de locale n'a été confirmée.

## F018 — Gestion des erreurs

### F018.001 Fallback silencieux des offres flash — IMPLÉMENTÉ

En cas d'échec API, le contenu statique existant reste affiché.

### F018.002 Ticker vide en cas d'absence de données — IMPLÉMENTÉ

Le ticker n'affiche pas de données de démonstration lorsque l'API ne fournit aucun résultat.

### F018.003 Message utilisateur structuré — PARTIEL / À CONFIRMER

Le contrat global pour distinguer erreur réseau, réponse invalide, indisponibilité serveur et absence de résultat reste à documenter et uniformiser.

## F019 — Données et intégrations

### F019.001 API backend — IMPLÉMENTÉ

**Intégration observée**

- backend Railway préconnecté ;
- endpoint d'offres tendance ;
- paramètres de limite et de score minimal ;
- consommation JSON ;
- sélection d'URL affiliée ou d'URL source.

### F019.002 Flux RSS côté client — IMPLÉMENTÉ SELON LE MODULE

**Capacités déclarées**

- récupération de flux via proxy CORS ;
- intégration de nouvelles offres ;
- enrichissement de la source ;
- actualisation périodique.

**Risques à encadrer**

- dépendance au proxy ;
- contenu non fiable ;
- doublons ;
- dates incohérentes ;
- erreurs de parsing ;
- limitations CORS ;
- responsabilité de la collecte côté client.

## F020 — Qualité et dette connue

### F020.001 Fichier de vérification Google obsolète — DETTE DOCUMENTÉE

Le README indique qu'un ancien fichier de vérification Google doit être supprimé du dépôt.

### F020.002 Données de démonstration — PRÉSENTES DANS LE MODULE HISTORIQUE

Le module mentionne plus de soixante offres de démonstration. Toute donnée de démonstration doit être distinguée clairement des données de production et ne jamais polluer les métriques publiques.

### F020.003 Architecture monolithique — DETTE STRUCTURELLE

Le document principal concentre HTML, CSS et logique applicative. La migration vers une architecture modulaire devra préserver le comportement observable, le SEO, la PWA, les performances et les liens existants.

## 2. Règle de maintenance

Pour chaque modification du frontend :

1. identifier les fonctionnalités touchées ;
2. mettre à jour leur statut ;
3. ajouter les nouveaux comportements et cas limites ;
4. relier la PR ou le sprint concerné ;
5. ne jamais marquer une capacité comme actuelle avant validation dans le code et dans l'environnement déployé.
