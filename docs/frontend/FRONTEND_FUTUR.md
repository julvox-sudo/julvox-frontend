# Julvox Frontend — Fonctionnalités futures

> Vision fonctionnelle de long terme. Ces éléments ne constituent pas un engagement de livraison immédiate.
>
> Toute promotion vers `FRONTEND_PRIORITES.md` doit être justifiée par une valeur utilisateur, une dépendance disponible, un coût estimé et des critères d'acceptation.

## FF001 — Assistant d'achat conversationnel

### Objectif

Permettre à l'utilisateur d'exprimer un besoin en langage naturel et de recevoir une aide structurée, explicable et fondée sur les données disponibles.

### Capacités futures

- compréhension d'un budget, d'un usage, d'une préférence et d'une contrainte ;
- questions de clarification ciblées ;
- génération d'une liste de critères ;
- comparaison de plusieurs solutions ;
- explication des compromis ;
- citation de la provenance des prix et caractéristiques ;
- mémorisation facultative des préférences ;
- possibilité de corriger une hypothèse ;
- conservation d'un historique de décision ;
- export du raisonnement sous forme de synthèse ;
- fonctionnement sans présentation d'une certitude injustifiée.

### États

- attente de besoin ;
- clarification ;
- recherche ;
- données insuffisantes ;
- recommandation ;
- contradiction ;
- erreur ;
- reprise d'une conversation.

## FF002 — Comparaison intelligente multicritère

### Capacités

- pondération manuelle des critères ;
- profils de comparaison prédéfinis ;
- simulation de scénarios ;
- sensibilité du classement aux poids ;
- justification de chaque rang ;
- mise en évidence des données manquantes ;
- comparaison de variantes proches ;
- exclusion automatique des incompatibilités ;
- score de confiance séparé du score d'adéquation ;
- historique des changements de classement.

## FF003 — Mémoire d'achat personnelle

### Capacités

- historique contrôlable des recherches ;
- préférences déclarées ;
- contraintes permanentes ;
- produits déjà possédés ;
- achats passés importés avec consentement ;
- budgets récurrents ;
- marques préférées ou exclues ;
- durée de conservation configurable ;
- suppression granulaire ;
- export intégral ;
- mode sans mémoire.

### Confidentialité

- consentement explicite ;
- visibilité des données utilisées ;
- distinction mémoire personnelle et données mondiales ;
- aucune réutilisation globale silencieuse ;
- contrôle par finalité.

## FF004 — Profils d'usage partagés

### Exemples

- foyer ;
- couple ;
- équipe ;
- association ;
- petite entreprise ;
- liste de naissance ;
- voyage en groupe.

### Fonctions

- rôles ;
- budgets partagés ;
- listes communes ;
- votes ;
- commentaires ;
- décisions finales ;
- journal d'activité ;
- révocation d'accès ;
- protection des données privées de chaque membre.

## FF005 — Analyse visuelle de produit

### Capacités

- recherche depuis une photo ;
- détection de texte ou référence ;
- proposition de correspondances ;
- confirmation manuelle ;
- comparaison de prix ;
- lecture d'une étiquette magasin ;
- estimation de la qualité d'une correspondance ;
- conservation de la photo uniquement selon consentement ;
- suppression immédiate possible.

### Limites obligatoires

- ne jamais présenter une correspondance incertaine comme certaine ;
- ne pas extraire de données personnelles inutiles ;
- afficher les zones reconnues ;
- permettre la correction.

## FF006 — Scan de code-barres

### Fonctions

- accès caméra ;
- saisie manuelle ;
- reconnaissance EAN/GTIN ;
- historique local facultatif ;
- recherche produit ;
- comparaison immédiate ;
- alerte si le produit exact n'est pas identifié ;
- gestion des variantes ;
- mode faible luminosité ;
- permission caméra expliquée.

## FF007 — Mode magasin

### Objectif

Aider à décider lors d'un achat physique.

### Fonctions

- scan produit ;
- prix local saisi ou photographié ;
- comparaison avec prix en ligne ;
- prise en compte du retrait immédiat ;
- calcul du coût total ;
- disponibilité locale ;
- carte des magasins ;
- liste d'achats ;
- fonctionnement dégradé hors ligne ;
- avertissement sur la fraîcheur des prix.

## FF008 — Carte et disponibilité locale

### Capacités

- recherche autour d'une zone ;
- consentement de localisation ;
- saisie manuelle d'une ville ;
- rayon configurable ;
- disponibilité par magasin ;
- prix local ;
- horaires ;
- retrait ;
- itinéraire externe ;
- accessibilité du magasin ;
- filtres de distance et stock.

## FF009 — Prévision de prix

### Affichage

- tendance ;
- intervalle d'incertitude ;
- horizon ;
- facteurs pris en compte ;
- date de calcul ;
- qualité des données ;
- historique des prévisions ;
- comparaison prévision/réalité.

### Règles

- présenter une probabilité, jamais une promesse ;
- distinguer prévision et observation ;
- expliquer l'incertitude ;
- empêcher une formulation manipulatrice.

## FF010 — Calendrier commercial intelligent

### Fonctions

- soldes ;
- Black Friday ;
- événements marchands ;
- cycles saisonniers ;
- dates de sortie ;
- rappels ;
- anticipation de baisse ;
- comparaison avec historique ;
- personnalisation par catégorie et pays.

## FF011 — Suivi de disponibilité

### Capacités

- alerte retour en stock ;
- précommande ;
- rupture ;
- disponibilité locale ;
- taille ou variante ;
- historique ;
- fréquence de contrôle ;
- sources multiples ;
- désactivation automatique après achat déclaré.

## FF012 — Suivi de livraison agrégé

### Capacités

- import d'une commande ;
- suivi multi-transporteurs ;
- timeline ;
- retard ;
- incident ;
- preuve de livraison ;
- notifications ;
- masquage des identifiants sensibles ;
- suppression après durée choisie.

## FF013 — Assistant après-achat

### Fonctions

- période de retour ;
- garantie ;
- facture ;
- manuel ;
- rappel d'entretien ;
- consommables ;
- suivi de baisse post-achat ;
- suggestion de réclamation si éligible ;
- fin de garantie ;
- revente ou recyclage.

## FF014 — Garantie et droits consommateurs

### Affichage

- garanties légales ;
- garanties commerciales ;
- délais ;
- conditions ;
- preuve requise ;
- pays applicable ;
- source officielle ;
- date de mise à jour ;
- avertissement de non-substitution à un conseil juridique.

## FF015 — Durabilité et réparabilité

### Critères

- indice de réparabilité ;
- disponibilité des pièces ;
- durée de support ;
- consommation énergétique ;
- emballage ;
- origine ;
- réparateurs ;
- reprise ;
- recyclage ;
- impact estimé et méthodologie.

### Règles

- séparer données officielles, déclarations fabricant et estimations ;
- exposer la provenance ;
- ne pas fabriquer un score global opaque.

## FF016 — Marché du reconditionné et de l'occasion

### Fonctions

- état détaillé ;
- grade ;
- batterie ;
- garantie ;
- vendeur professionnel ou particulier ;
- photos réelles ;
- défauts ;
- accessoires ;
- historique de prix par état ;
- comparaison avec neuf ;
- coût d'usage.

## FF017 — Abonnements et coût total de possession

### Capacités

- prix d'achat ;
- abonnement ;
- consommables ;
- énergie ;
- entretien ;
- assurance ;
- frais de résiliation ;
- durée d'engagement ;
- coût sur plusieurs horizons ;
- hypothèses modifiables.

## FF018 — Simulateurs financiers d'achat

### Exemples

- paiement comptant ;
- paiement fractionné ;
- crédit ;
- location ;
- abonnement ;
- reprise ;
- remise conditionnelle.

### Règles

- afficher le coût total ;
- afficher les frais ;
- ne pas masquer le taux ;
- avertir des hypothèses ;
- ne pas présenter une option coûteuse comme une économie.

## FF019 — Alertes avancées

### Déclencheurs

- prix inférieur à un seuil ;
- prix proche du plus bas historique ;
- confiance supérieure à un seuil ;
- marchand précis ;
- retour en stock ;
- nouvelle variante ;
- livraison plus rapide ;
- meilleure garantie ;
- baisse de coût total ;
- fenêtre de temps personnalisée.

## FF020 — Centre de décisions

### Contenu

- décisions en cours ;
- critères ;
- candidats ;
- éléments éliminés ;
- raisons ;
- données nouvelles ;
- changement de recommandation ;
- décision finale ;
- résultat après achat ;
- leçons facultatives.

## FF021 — Communauté et contributions

### Fonctions

- signaler un prix ;
- confirmer une disponibilité ;
- signaler une erreur ;
- ajouter une photo ;
- commenter ;
- voter sur l'utilité ;
- historique de contribution ;
- réputation explicable ;
- modération ;
- recours.

### Sécurité

- prévention du harcèlement ;
- filtrage des données personnelles ;
- limites de fréquence ;
- provenance ;
- distinction observation et opinion.

## FF022 — Avis structurés

### Dimensions

- qualité ;
- fiabilité ;
- facilité ;
- durabilité ;
- service marchand ;
- livraison ;
- rapport qualité-prix ;
- contexte d'usage ;
- durée de possession.

### Règles

- achat vérifié lorsque démontrable ;
- conflit d'intérêts déclaré ;
- synthèse explicable ;
- conservation des avis contradictoires ;
- modération transparente.

## FF023 — Créateurs et experts

### Capacités

- profils ;
- domaines d'expertise ;
- méthodologie ;
- publications ;
- comparatifs ;
- conflits d'intérêts ;
- liens affiliés clairement signalés ;
- historique de corrections.

## FF024 — Programme marchand transparent

### Fonctions

- fiche marchand revendiquée ;
- informations légales ;
- flux produit ;
- qualité du flux ;
- réponse aux signalements ;
- promotions sponsorisées identifiées ;
- statistiques de fiabilité ;
- journal des changements.

## FF025 — Espace administrateur avancé

### Capacités

- supervision de la qualité des données ;
- anomalies ;
- doublons ;
- conflits ;
- sources ;
- marchands ;
- modération ;
- campagnes ;
- métriques ;
- permissions ;
- audit ;
- actions réversibles.

## FF026 — Expérimentation produit

### Capacités

- feature flags ;
- cohortes ;
- tests A/B ;
- exposition enregistrée ;
- métriques de garde-fou ;
- arrêt d'urgence ;
- analyse par version ;
- respect du consentement ;
- impossibilité de tester des pratiques trompeuses.

## FF027 — Mode faible connexion

### Fonctions

- images réduites ;
- pagination compacte ;
- cache ;
- synchronisation différée ;
- désactivation des animations ;
- mode texte ;
- indication des données périmées ;
- économie de batterie.

## FF028 — Applications installables multi-plateformes

### Cibles

- PWA avancée ;
- emballage mobile éventuel ;
- widgets ;
- raccourcis ;
- partage depuis le système ;
- ouverture de liens profonds ;
- notifications ;
- synchronisation.

## FF029 — Accessibilité avancée

### Capacités

- profils de contraste ;
- taille de texte ;
- espacement ;
- dyslexie ;
- navigation vocale ;
- descriptions enrichies ;
- alternatives aux graphiques ;
- mode simplifié ;
- tests avec technologies d'assistance.

## FF030 — Transparence algorithmique

### Fonctions

- afficher pourquoi un résultat apparaît ;
- critères de classement ;
- effet de la personnalisation ;
- éléments sponsorisés ;
- données manquantes ;
- possibilité de désactiver certains signaux ;
- historique de modification des méthodes ;
- documentation publique simplifiée.

## FF031 — Multi-pays et multi-devises

### Capacités

- marché ;
- destination ;
- origine d'expédition ;
- taxes ;
- douanes ;
- disponibilité ;
- devise source ;
- conversion séparée et datée ;
- comparaison sans conversion trompeuse ;
- règles locales.

## FF032 — API utilisateur et automatisations

### Fonctions frontend

- gestion de clés ;
- permissions ;
- quotas ;
- journaux ;
- révocation ;
- webhooks ;
- documentation interactive ;
- exemples ;
- environnement de test.

## FF033 — Extensions navigateur

### Capacités

- détection d'une fiche produit ;
- historique de prix ;
- alternatives ;
- score Julvox ;
- alerte ;
- ajout comparateur ;
- respect des permissions minimales ;
- désactivation par site.

## FF034 — Widget intégrable

### Fonctions

- comparateur embarqué ;
- badge de confiance ;
- historique ;
- meilleure offre ;
- thème ;
- dimensions ;
- consentement ;
- signature des données ;
- attribution Julvox.

## FF035 — Recherche multimodale

### Entrées

- texte ;
- photo ;
- code-barres ;
- URL ;
- voix ;
- document ;
- liste de critères.

### Sorties

- correspondances ;
- confiance ;
- clarification ;
- comparaison ;
- alternatives ;
- justification.

## Gouvernance de la vision future

Chaque fonctionnalité future doit rester :

- explicable ;
- respectueuse de la vie privée ;
- fondée sur une provenance ;
- accessible ;
- réversible lorsque possible ;
- compatible avec la promesse : « Achetez mieux. Décidez avec confiance. »
