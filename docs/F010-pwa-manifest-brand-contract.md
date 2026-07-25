# F010 — Identité de marque du manifest PWA

## Objectif

Faire de `config/runtime-contract.json` la source de vérité pour l’identité publique de l’application installable.

## Champs consommés

Le build reconstruit dans `dist/manifest.json` :

- `name` depuis `application.name` et `application.tagline` ;
- `short_name` depuis `application.name` ;
- `description` depuis `application.description` ;
- le libellé de la première capture depuis `application.name` et `application.tagline`.

## Migration contrôlée

Le fichier source `manifest.json` conserve volontairement les valeurs historiques utilisées comme ancres de migration. Le build échoue si ces ancres changent sans adaptation explicite.

La sortie construite ajoute `_runtime_contract` comme marqueur de traçabilité. Ce champ n’est pas utilisé par l’application ; il permet au contrôle CI de prouver la consommation du contrat.

## Hors périmètre

F010 ne renomme pas les raccourcis fonctionnels, ne modifie pas leurs URL, les icônes, les couleurs, les catégories, le mode d’affichage ou les paramètres de lancement.

Ces éléments relèvent soit du comportement PWA, soit de futures décisions produit.

## Validation

`npm run build` exécute `verify:pwa-manifest-brand-consumption` et refuse notamment :

- une divergence entre le contrat et le manifest construit ;
- la persistance de l’ancienne identité DealScan dans les champs migrés ;
- l’absence du marqueur de traçabilité F010.