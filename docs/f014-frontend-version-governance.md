# F014 — Gouvernance de la version frontend

## Objectif

Faire de `application.frontend_version` dans `config/runtime-contract.json` la version applicative de référence et empêcher toute divergence silencieuse avec le package, le cache PWA et les sorties construites.

## Règles

- `application.frontend_version` doit être une version sémantique valide.
- `package.json.version` doit lui correspondre exactement.
- `pwa.cache_version` doit correspondre à la version majeure sous la forme `v<major>`.
- `dist/index.html` expose la version dans `meta[name="application-version"]`.
- `dist/sw.js` doit utiliser la version de cache définie par le contrat.

## Traçabilité

La sortie HTML contient le marqueur :

`runtime-contract:application.frontend_version`

La métadonnée historique `build-version` reste indépendante : elle identifie une construction, tandis que `application-version` identifie la release frontend.

## Hors périmètre

- modification de la version actuelle `17.0.0` ;
- automatisation des releases GitHub ;
- définition d’une politique complète SemVer ;
- renommage des caches historiques ;
- modification de la stratégie de cache.

## Validation

Le pipeline exécute successivement :

- `integrate:frontend-version` ;
- `verify:frontend-version-consumption`.

Le build échoue dès qu’une version diverge ou qu’une sortie construite ne consomme pas le contrat.
