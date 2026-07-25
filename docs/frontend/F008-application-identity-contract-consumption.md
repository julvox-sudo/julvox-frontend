# F008 — Consommer l’identité applicative du contrat

## Objectif

Faire construire le titre principal du document à partir de `application.name` et `application.frontend_version` du contrat runtime, sans changer le titre effectivement présenté aujourd’hui.

## Comportement préservé

Le titre reste :

```text
DealScan v17 — Meilleurs Deals & Promos vérifiés par NovaDeal™ | julvox.com
```

La version visible conserve volontairement le numéro majeur (`17`) tandis que le contrat et `package.json` conservent la version complète (`17.0.0`).

## Transformation

La source historique reste intacte. Pendant le build statique, la déclaration `<title>` est reconstruite depuis :

- `application.name` ;
- la version majeure de `application.frontend_version`.

Un marqueur de traçabilité est ajouté dans `dist/index.html`.

## Vérification

`scripts/verify-application-identity-contract-consumption.js` confirme que :

- la source conserve exactement un titre historique attendu ;
- le titre construit correspond au contrat ;
- le marqueur de traçabilité est présent exactement une fois ;
- `package.json` et le contrat déclarent la même version complète.

## Limite volontaire

Cette étape ne remplace pas toutes les occurrences éditoriales de « DealScan » dans l’interface. Elle contractualise uniquement l’identité portée par le titre HTML principal.
