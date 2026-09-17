# Billet Doux — pack Netlify v1.5

## Nouveautés
- Carrousel réellement infini : après la dernière illustration, la première revient sans fin.
- Swipe mobile + drag souris/trackpad, cartes voisines visibles.
- Nouveau texte d’introduction et indication « Touche la carte pour écrire ».
- Écran final épuré : seulement « Copier le lien » et « Partager ».
- CTA courrier physique discret sous les boutons de partage.
- Vue destinataire plein écran mobile, sans « Un billet pour toi ».
- Après ouverture du billet : lien « Écrire mon billet ».
- Aperçu de partage : titre « Billet Doux » + image construite avec l’initiale de la signature.
- Support de la typo propriétaire Coucouaurelien pour le message et la signature.

## Police propriétaire — UNE ACTION MANUELLE
Le fichier de police n’est pas inclus dans ce pack.
Renomme ta police :
`Coucouaurelien-V2-Regular.otf`

Puis dépose-la dans :
`site/assets/fonts/`

Le CSS est déjà configuré. Après le commit GitHub, Netlify redéploie automatiquement.

Les images d’aperçu A–Z sont déjà rasterisées avec la typo pour afficher l’initiale dans les aperçus de partage.

## Lien vers l’offre courrier physique
Édite :
`site/config.js`

Et remplace `physicalMailUrl` par l’URL exacte de ta page boutique dédiée.
La valeur actuelle renvoie simplement vers `https://coucouaurelien.com`.

## Mise à jour
Tu peux uploader le contenu complet de ce dossier par-dessus le dépôt GitHub existant puis faire Commit changes.
Netlify rebâtira automatiquement le site si le dépôt est connecté.

## Apps Script
Cette version ne change pas le schéma Google Sheet. Tu peux conserver le Code.gs de la v1.4 si celui-ci est déjà installé et déployé.
