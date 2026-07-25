# F007 — Consommer le contrat du script d’améliorations

## Objectif

Faire utiliser au frontend construit la valeur `runtime.enhancements_script` du contrat runtime, sans changer le script réellement chargé.

## Comportement préservé

Le navigateur charge toujours :

```text
/enhancements_v3.js
```

L’attribut `defer` est conservé. L’ordre relatif du script dans `index.html` ne change pas.

## Transformation

La source historique reste intacte. Pendant le build statique, la déclaration du script est reconstruite depuis `runtime.enhancements_script`.

Le build échoue si :

- la déclaration historique n’existe pas exactement une fois ;
- la sortie ne contient pas exactement une déclaration configurée ;
- le marqueur de traçabilité est absent ou dupliqué ;
- le fichier configuré n’est pas présent dans `dist`.

## Vérification

`scripts/verify-enhancements-script-contract-consumption.js` confirme que la sortie construite respecte le contrat et que l’artefact référencé existe réellement.

## Limite volontaire

Cette étape ne modifie ni le contenu de `enhancements_v3.js`, ni son comportement, ni son ordre d’exécution.
