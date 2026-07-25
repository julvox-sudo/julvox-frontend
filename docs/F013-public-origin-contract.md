# F013 — Origine publique contractualisée

## Objectif

Faire de `application.public_base_url` dans `config/runtime-contract.json` l’unique source de vérité de l’origine publique Julvox utilisée par les sorties construites.

## Constat

Avant F013, `https://julvox.com` était écrit directement dans plusieurs métadonnées du document et dans les comportements de navigation du Service Worker. Un changement de domaine ou d’environnement pouvait donc désynchroniser les métadonnées, les notifications et les fenêtres déjà ouvertes.

## Consommation pendant le build

Le build valide que `application.public_base_url` :

- est une URL valide ;
- utilise HTTP ou HTTPS ;
- fournit une origine exploitable.

Il l’utilise ensuite dans :

- les URL publiques du `<head>` de `dist/index.html` ;
- la constante `PUBLIC_ORIGIN` de `dist/sw.js` ;
- l’URL par défaut des notifications ;
- la navigation vers un deal après un clic ;
- la détection d’une fenêtre Julvox déjà ouverte.

Des marqueurs `runtime-contract:application.public_base_url` permettent d’identifier la provenance de ces valeurs dans les fichiers construits.

## Vérification

`scripts/verify-public-origin-contract-consumption.js` vérifie :

- la présence et la validité de la valeur contractuelle ;
- sa consommation dans `dist/index.html` ;
- la déclaration de `PUBLIC_ORIGIN` dans `dist/sw.js` ;
- son utilisation dans les quatre chemins de navigation concernés ;
- l’absence de littéraux historiques non contractualisés dans le Service Worker construit.

Le contrôle est exécuté par `npm run build`.

## Hors périmètre

F013 ne change pas :

- le domaine public actuel ;
- les chemins fonctionnels ;
- les emails ou mentions légales ;
- les liens vers des services tiers ;
- la stratégie de notifications ;
- les endpoints backend.

## Risque connu

Le build conserve les valeurs historiques comme ancres de migration dans les fichiers sources. Toute modification de ces ancres doit être accompagnée d’une évolution explicite du transformateur de build.
