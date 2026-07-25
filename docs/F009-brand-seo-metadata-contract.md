# F009 — Métadonnées de marque et SEO

## Objectif

Faire de `config/runtime-contract.json` la source de vérité de l’identité publique de Julvox dans la sortie construite.

## Identité validée

- Nom : `Julvox`
- Signature : `Achetez mieux. Décidez avec confiance.`
- Description : `Julvox analyse les offres, compare les prix et vous aide à prendre des décisions d’achat fiables, transparentes et argumentées.`

## Métadonnées construites

Le build consomme cette identité pour produire :

- le titre HTML ;
- la description SEO et l’auteur ;
- les titres, descriptions et nom de site Open Graph ;
- les titres et descriptions Twitter ;
- le titre d’installation Apple ;
- le nom et la description du site dans les données structurées JSON-LD.

## Stratégie de migration

Le fichier source `index.html` conserve provisoirement les valeurs historiques. `build-static.js` exige leur présence exacte puis les remplace uniquement dans `dist/index.html`. Cette contrainte rend la migration vérifiable et empêche une modification silencieuse du modèle source.

## Vérification

`scripts/verify-brand-metadata-contract-consumption.js` vérifie que :

- les champs `application.name`, `application.tagline` et `application.description` sont définis ;
- chaque métadonnée construite correspond au contrat ;
- les principales anciennes valeurs DealScan ont disparu de la sortie ;
- la trace de consommation du contrat apparaît exactement une fois.

## Limites

F009 ne modifie pas encore les images sociales, le compte Twitter historique, les mots-clés, les icônes ni le contenu visible de la page. Ces éléments demandent des décisions de marque distinctes.
