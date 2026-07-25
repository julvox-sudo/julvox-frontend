# F006 — Consommer le contrat du service worker

## Objectif

Faire utiliser au frontend construit les valeurs `pwa.service_worker_path` et `pwa.cache_version` du contrat runtime, sans changer le service worker réellement enregistré.

## Comportement préservé

Le navigateur enregistre toujours :

```text
/sw.js?v=17
```

Le scope reste `/`. Les notifications, l’installation PWA, les raccourcis et les échanges avec le Brain ne sont pas modifiés.

## Transformation

La source historique reste intacte. Pendant le build statique, l’appel d’enregistrement est reconstruit depuis :

- `pwa.service_worker_path` ;
- `pwa.cache_version`.

Le build échoue si l’appel historique n’est pas trouvé exactement une fois.

## Vérification

`scripts/verify-service-worker-contract-consumption.js` confirme que :

- la source conserve le contrat historique attendu ;
- la sortie construite ne conserve pas l’appel autonome ;
- l’URL construite correspond exactement au contrat ;
- un seul enregistrement configuré existe ;
- le marqueur de traçabilité est présent.

## Limite volontaire

Cette étape ne modifie pas le contenu de `sw.js`, sa stratégie de cache ou sa logique réseau.