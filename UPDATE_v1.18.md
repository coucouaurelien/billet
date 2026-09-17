# Mise à jour v1.18

Cette version corrige le cas « lien créé puis billet introuvable ».

## Cause
La v1.17 utilisait `onlyIfNew` de Netlify Blobs. Une erreur connue du SDK peut dans certains cas annoncer `modified: true` sans que l'écriture ait réellement abouti.

## Correction
- plus aucune écriture conditionnelle pour créer les billets ;
- écriture normale dans Netlify Blobs ;
- relecture immédiate en cohérence forte ;
- comparaison du slug, du message, de la signature et du dessin ;
- le lien n'est rendu à l'utilisateur que si cette vérification réussit ;
- `/api/health` teste maintenant réellement l'écriture + relecture Blobs.

## Installation
Remplacer le contenu du repo GitHub avec cette version et laisser Netlify redéployer. Aucun changement Apps Script n'est nécessaire si la v1.17 y est déjà déployée.
