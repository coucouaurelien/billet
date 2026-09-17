# Mise à jour v1.14 — création des billets

Cette version retire le timeout artificiel de 7 secondes côté Netlify et accélère Apps Script.

## À faire

1. GitHub : remplace les fichiers du projet avec ceux de ce pack et commit.
2. Google Sheet > Extensions > Apps Script : remplace `Code.gs` par celui de ce pack.
3. Dans Apps Script, exécute `setup()` une fois.
4. Apps Script > Déployer > Gérer les déploiements > crayon > Nouvelle version > Déployer.
5. L'URL `/exec` reste la même : pas besoin de changer `GOOGLE_SCRIPT_URL` dans Netlify.

## Ce qui change

- plus de coupe-circuit à 7 s ;
- compteur de slug rapide après la première utilisation d'un prénom ;
- protection contre les doublons avec `request_id` ;
- colonnes du Sheet toujours réordonnables par nom d'en-tête ;
- tracking d'ouverture toujours désactivé.
