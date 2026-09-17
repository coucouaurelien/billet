# Mise à jour v1.11 — création des billets

Cette version corrige l'erreur `Inactivity Timeout` pendant la création.

## Important : Google Apps Script doit aussi être mis à jour

1. Ouvre ton Google Sheet > Extensions > Apps Script.
2. Remplace tout le contenu de `Code.gs` par le fichier `google-apps-script/Code.gs` de ce pack.
3. Enregistre.
4. Lance manuellement la fonction `setup()` une fois.
5. Va dans Déployer > Gérer les déploiements > crayon > Nouvelle version > Déployer.
6. L'URL `/exec` peut rester la même : pas besoin de changer la variable Netlify si l'URL n'a pas changé.

## Ce que change le nouveau script

- Il ne scanne plus tous les slugs à chaque création.
- Les colonnes du Sheet peuvent être réordonnées librement.
- Les anciennes colonnes de suivi d'ouverture/reveal/share sont supprimées par `setup()`.
- Les ouvertures ne sont plus écrites dans le Sheet.
- Les billets récents sont mis en cache pour accélérer leur première ouverture.

Puis uploade le reste du pack sur GitHub. Netlify redéploiera automatiquement.
