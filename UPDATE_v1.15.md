# Mise à jour v1.15

Cette version corrige les billets créés puis immédiatement affichés comme introuvables.

1. GitHub : remplace les fichiers du projet par ceux de ce pack et commit.
2. Google Sheet > Extensions > Apps Script : remplace Code.gs par `google-apps-script/Code.gs`.
3. Exécute `setup()` une fois.
4. Apps Script > Déployer > Gérer les déploiements > crayon > Nouvelle version > Déployer.
5. L'URL `/exec` peut rester identique : aucune variable Netlify à modifier.

Le script mémorise maintenant directement la ligne correspondant à chaque slug et force l'écriture principale avant de retourner le lien.
