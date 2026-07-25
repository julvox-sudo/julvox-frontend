# F015 — Contrat des capacités applicatives

## Objectif

Déclarer explicitement les capacités actuellement exposées par Julvox dans `application.features` et les rendre disponibles dans la configuration runtime générée.

## Capacités déclarées

- `search`
- `price_comparison`
- `wishlist`
- `push_notifications`
- `pwa_installation`
- `authentication`
- `sharing`
- `offline_support`

Chaque capacité est un booléen. Les noms utilisent uniquement des lettres minuscules, des chiffres et des underscores, et commencent par une lettre.

## Consommation

`scripts/generate-runtime-config.js` copie exactement `application.features` dans :

```js
window.JULVOX_RUNTIME_CONFIG.application.features
```

La configuration générée est figée récursivement afin d'empêcher une modification accidentelle des capacités dans le navigateur.

## Validation

Le build échoue si :

- `application.features` manque ou n'est pas un objet ;
- aucune capacité n'est déclarée ;
- un nom de capacité est invalide ;
- une valeur n'est pas booléenne ;
- les capacités construites diffèrent du contrat ;
- l'objet construit n'est pas immuable.

## Limites volontaires

F015 pose la fondation contractuelle uniquement. Il ne masque pas encore les éléments d'interface et ne modifie aucun comportement métier selon les drapeaux. Les futures fonctionnalités pourront consommer ces valeurs progressivement, dans des sprints ciblés et vérifiables.
