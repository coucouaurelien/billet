# Mise à jour v1.16 — lecture fiable avec Netlify Blobs

Cette version sort la lecture des billets de Google Sheets.

- À la création, Google Sheet garde l’archive/corpus.
- Dès que Google confirme le slug, Netlify stocke `slug + dessin + message + signature` dans Netlify Blobs.
- À l’ouverture, le billet est lu directement chez Netlify.
- Les anciens billets utilisent Google une seule fois, puis sont automatiquement copiés dans Netlify Blobs.

## Installation

1. Remplacer les fichiers du repo GitHub par ceux de ce pack.
2. Commit.
3. Netlify redéploie automatiquement.
4. **Ne touche pas à Apps Script** si tu es déjà en v1.15.
5. Aucune nouvelle variable d’environnement à créer : Netlify Blobs est intégré au projet.

Le `package.json` installe `@netlify/blobs`.
