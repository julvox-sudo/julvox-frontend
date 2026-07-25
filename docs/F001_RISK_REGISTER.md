# F001 — Registre initial des risques

| Risque | Niveau | Garde-fou |
|---|---:|---|
| Rupture des fonctions appelées par `onclick` | Critique | conserver les globals jusqu’au remplacement validé |
| Changement d’ordre entre script principal et `enhancements_v3.js` | Critique | contrôle automatique de caractérisation |
| Modification involontaire de `window.renderDeals` | Critique | test dédié avant toute extraction |
| Multiplication ou fuite de timers | Élevé | inventorier puis centraliser progressivement |
| Régression du cache ou du mode hors ligne | Critique | ne pas modifier `sw.js` sans versionnement explicite |
| Changement implicite d’endpoint | Critique | ne pas inventer de contrat backend |
| Échec silencieux d’un appel API | Élevé | caractériser les fallbacks avant refactorisation |
| Divergence entre source et `dist/` | Moyen | build et vérification automatiques |
