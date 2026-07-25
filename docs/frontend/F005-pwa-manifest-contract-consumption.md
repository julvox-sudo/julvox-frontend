# F005 — Consommation du chemin du manifeste PWA

## Objectif

Faire utiliser au frontend construit la valeur `pwa.manifest_path` définie dans `config/runtime-contract.json`, sans modifier le comportement PWA ni le fichier source historique `index.html`.

## Changement

Pendant le build statique :

1. `build-static.js` lit le contrat de configuration ;
2. il exige la présence exacte du lien historique vers `/manifest.json` ;
3. il reconstruit ce lien avec la valeur issue du contrat ;
4. il ajoute un marqueur HTML de traçabilité uniquement dans `dist/index.html`.

Avec le contrat actuel, le navigateur charge toujours exactement :

```text
/manifest.json
```

## Contrats préservés

- aucun endpoint du Brain ne change ;
- aucune donnée utilisateur ne change ;
- `index.html` source reste inchangé ;
- le manifeste servi reste le même ;
- aucun changement d’écran ou d’interaction utilisateur.

## Garde-fous

`scripts/verify-pwa-contract-consumption.js` vérifie que :

- la source conserve le lien historique attendu ;
- le marqueur de build n’est pas présent dans la source ;
- `dist/index.html` contient le marqueur ;
- le lien construit correspond exactement au contrat.

## Limite volontaire

Cette étape ne migre pas encore :

- l’enregistrement de `/sw.js` ;
- la version de cache `v17` dans `sw.js` ;
- les autres chemins PWA.

Chacune de ces valeurs restera traitée dans une étape séparée et réversible.