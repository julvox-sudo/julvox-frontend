# JULVOX-PRODUCT-VISION-SMART-SCAN-01

## Mission

Faire converger quatre points d'entrée vers un seul parcours Julvox :

```text
Code-barres   Photo   Lien   Texte
      \         |      |      /
             Identification
                    ↓
          Confirmation humaine
                    ↓
               Analyse Julvox
                    ↓
              Verdict expliqué
```

La fonctionnalité reste un compagnon de décision avant achat. Elle ne crée ni catalogue public, ni marketplace, ni mur de promotions, ni ranking publicitaire.

## Dépendance backend

Cette branche frontend est empilée sur le head exact de la PR frontend #26 (`b393f59a3d17f4d2bf7181460d4820cd245db66b`).

Le parcours réseau complet dépend de la PR backend Julvox dédiée à Smart Scan. Tant que ce backend n'est pas déployé sur l'environnement visé, l'interface échoue proprement et n'invente aucune identification ni recommandation.

## Mode code-barres

- réutilise le scanner caméra déjà implémenté par `JULVOX-PRODUCT-BARCODE-SCANNER-01` ;
- conserve la saisie manuelle ;
- accepte l'entrée destinée à EAN-8, UPC-A et EAN-13 ;
- le contrôle de clé GTIN et l'identification exacte restent la responsabilité du backend ;
- le code capturé est présenté à l'utilisateur avant identification ;
- même une correspondance exacte doit ensuite être confirmée explicitement.

## Mode photo

Entrée : `<input type="file" capture="environment">`, JPEG/PNG/WebP, 6 MiB maximum.

### Vie privée en ligne

- aperçu via `URL.createObjectURL()` ;
- conversion en data URL uniquement au moment de la requête ;
- suppression de la référence `File` et révocation de l'Object URL immédiatement après réponse ou erreur ;
- aucune image dans l'historique Julvox ;
- aucune galerie Julvox.

### Brouillon hors ligne

La photo n'est persistée localement que si l'utilisateur choisit explicitement « Enregistrer le brouillon hors ligne ».

Elle est alors stockée dans IndexedDB :

```text
julvox-smart-scan-private-v1 / photoDrafts
```

avec :

- accès local à l'appareil ;
- pas de base64 dans `localStorage` ;
- pas de photo dans l'historique ;
- expiration maximale de 24 h ;
- restauration uniquement pour reprendre le brouillon.

Le brouillon texte associé est limité à 20 éléments.

## Mode lien

Contrôle client des domaines autorisés :

- Amazon.fr ;
- Fnac ;
- Darty ;
- Boulanger ;
- Ikea ;
- Cdiscount ;
- Leroy Merlin.

Le client ne déduit jamais le produit depuis le slug de l'URL. Il délègue l'identification au backend factuel.

## Mode texte

Une description libre est envoyée au même endpoint d'identification.

Exemple :

> Je cherche un casque Bluetooth pour mon fils.

Les résultats restent des candidats à confirmer, jamais un produit imposé automatiquement.

## Confirmation obligatoire

La carte de candidats pose explicitement :

> Quel produit regardes-tu ?

L'utilisateur choisit un candidat et appuie sur :

> C'est ce produit

Le client appelle ensuite `/smart-scan/confirm`. Aucune analyse n'est lancée si `confirmedProduct` est absent.

Un pourcentage de confiance n'est affiché que si le backend fournit réellement une valeur numérique. Aucun `91 %`, `95 %` ou autre valeur illustrative n'est codé dans l'interface.

## Analyse

Après confirmation, l'utilisateur peut renseigner seulement ce qu'il connaît :

- prix affiché ;
- devise ;
- magasin facultatif pour l'historique local ;
- pays du prix ;
- état ;
- budget ;
- urgence.

Les champs sont volontairement initialisés à « À préciser » ou « Je ne précise pas » : aucune devise, aucun pays, aucun état et aucune urgence ne sont supposés.

La question d'action reste :

> Est-ce une bonne décision pour moi maintenant ?

## Vocabulaire public des verdicts

Uniquement :

```text
buy_now      -> Acheter maintenant
wait         -> Attendre
compare_more -> Comparer davantage
do_not_buy   -> Ne pas acheter
```

Le client ne synthétise pas lui-même le verdict ; il affiche le verdict renvoyé par la frontière Smart Scan et se rabat conservativement sur « Comparer davantage » si une valeur inattendue arrive.

## Transparence

La carte de résultat possède des sections séparées pour :

- Pourquoi ;
- Risques ;
- Informations manquantes ;
- Ce qui pourrait changer la recommandation ;
- nombre de preuves factuelles exposées.

Une donnée absente n'est jamais remplacée par une phrase présentant une estimation comme un fait.

## Hors ligne

Sans connexion :

- le scanner/saisie reste accessible ;
- une photo peut être prise ;
- code, lien, texte et informations magasin peuvent être conservés en brouillon ;
- une photo peut être conservée temporairement et localement uniquement après action explicite ;
- aucun appel réseau n'est prétendu réussi ;
- le message utilisateur est :

> Produit enregistré. Connexion nécessaire pour récupérer les prix et l'analyse complète.

## Historique utilisateur

L'historique Smart Scan n'est écrit que si le réglage déjà existant :

```text
julvox:history:enabled = true
```

est actif.

Il conserve au maximum :

- date ;
- produit confirmé ;
- magasin saisi ;
- prix ;
- devise ;
- verdict ;
- première raison retournée.

Il ne conserve jamais :

- photo ;
- Blob ;
- data URL ;
- miniature ;
- liste des hypothèses visuelles rejetées.

## Accessibilité

- `role="dialog"` + `aria-modal` ;
- statut `aria-live="polite"` ;
- tabs accessibles clavier, flèches gauche/droite ;
- focus contenu dans le dialogue ;
- fermeture Échap ;
- contrôles >= 48 px ;
- focus visible ;
- aucune information transmise uniquement par son ;
- saisie manuelle toujours disponible ;
- layouts mobile et paysage ;
- contenu défilable compatible zoom élevé.

## Branding

Aucun fichier de `brand/`, aucun glyph, aucun logo horizontal et aucune couleur officielle de ressource A2.2 n'est remplacé. Smart Scan utilise les tokens visuels déjà présents dans l'interface Julvox.

## Fichiers frontend ajoutés/modifiés

- `scripts/product-smart-scan-01.js` ;
- `scripts/product-smart-scan-01-hardening.js` ;
- `scripts/product-smart-scan-01-integrate.js` ;
- `tests/ui-00/product-smart-scan-01.test.js` ;
- `package.json` ;
- ce document.

## Validation Android réelle à effectuer avant Ready

1. ouvrir la Preview depuis Chrome Android ;
2. ouvrir « Scanner un produit » et vérifier que Smart Scan s'ouvre ;
3. Code-barres : scanner puis confirmer le candidat ;
4. saisir manuellement le même code ;
5. Photo : appareil photo -> aperçu -> identification -> vérifier disparition de l'aperçu après réponse ;
6. Lien : tester un domaine autorisé puis un domaine rejeté ;
7. Texte : obtenir plusieurs candidats et vérifier la confirmation obligatoire ;
8. mode avion : saisir un code, prendre une photo, enregistrer un brouillon, saisir un prix ;
9. revenir en ligne et reprendre l'analyse ;
10. TalkBack : parcourir tabs, candidats, confirmation et résultat ;
11. clavier matériel : tabs, focus trap, Échap ;
12. zoom navigateur 200 % ;
13. portrait puis paysage ;
14. vérifier qu'aucun son n'est nécessaire ;
15. activer puis désactiver l'historique et confirmer qu'aucune photo n'y apparaît.

Aucun passage en Ready ni aucune fusion ne doit être effectué avant les preuves CI et cette validation humaine.
