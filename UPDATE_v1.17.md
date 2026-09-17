# Billet Doux — mise à jour v1.17

## Ce qui change

La création du billet est désormais **Netlify-first** :

1. le navigateur envoie le message à Netlify ;
2. Netlify réserve immédiatement un slug unique (`amandine`, `amandine-2`, etc.) et enregistre `card_id + message + signature` dans Netlify Blobs ;
3. le lien est rendu immédiatement à l'utilisateur ;
4. Netlify déclenche ensuite `sync-google` en arrière-plan ;
5. Google Sheets reste l'archive / corpus et n'est plus dans le chemin critique de création ni de lecture.

Si Google est lent ou momentanément indisponible, le billet reste créé et lisible.

## Mise à jour

### 1. GitHub / Netlify
Remplace le contenu du repo par ce pack puis commit. Netlify redéploiera automatiquement.

### 2. Apps Script
Dans le Google Sheet : **Extensions → Apps Script**.

- remplace `Code.gs` par celui de ce pack ;
- enregistre ;
- tu peux exécuter `setup()` une fois (sans danger) ;
- **Déployer → Gérer les déploiements → crayon → Nouvelle version → Déployer**.

L'URL `/exec` et les variables Netlify ne changent pas.

## Important

Les nouveaux billets utilisent Netlify comme source principale. Le Sheet n'est qu'une copie asynchrone. Les anciens billets continuent d'utiliser le fallback Google si nécessaire.
