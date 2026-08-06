# JULVOX-BINARY-INTEGRITY-01

Branche technique isolée. Ne pas fusionner.

Base : `main` à `f013900fc639d907776a60f64c6f12e0b09f8739`.

Cette branche contient uniquement des preuves de transport :

- deux SVG transmis en UTF-8 avec SHA Git exact ;
- un favicon PNG 16 transmis en Base64 avec SHA Git exact ;
- un PNG 192 exact déjà présent dans la base d'objets Git ;
- un premier essai PNG 192 volontairement conservé sous le nom `julvox-app-icon-192-transmitted.png`, dont le SHA Git diverge à cause d'une chaîne Base64 transmise incorrectement ;
- les tailles et empreintes attendues dans `expected.json`.

Le PNG 512 officiel n'est pas présent dans cette branche. Son SHA Git théorique est `c3586617e27b9d8c8ad52d0cb0bf714f98bda975`.

Aucun workflow, aucune PR et aucun déploiement ne doivent être créés depuis cette branche.
