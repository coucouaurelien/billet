# Mise à jour v1.19

Correction ciblée de la page destinataire.

- Le billet est lu directement dans Netlify Blobs par `recipient-page.mjs`.
- Plus de requête JavaScript intermédiaire vers `/api/billet` pour les nouveaux billets.
- `/api/billet` reste disponible en fallback pour les anciens billets.
- La page destinataire est maintenant `no-store` car elle contient le message privé.
- Aucun changement Apps Script / aucune nouvelle variable d’environnement.

Après déploiement, le billet déjà existant `/a` doit fonctionner sans être recréé.
