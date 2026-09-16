# Relier le site à Google Sheets

## 1 — Créer le Sheet
Crée un Google Sheet vide, puis ouvre **Extensions > Apps Script** depuis CE Sheet.

## 2 — Coller le code
Remplace le contenu de l’éditeur par `Code.gs`.

## 3 — Mettre le secret
Dans **Paramètres du projet > Propriétés du script**, crée :

- clé : `BILLET_API_SECRET`
- valeur : ton secret long et aléatoire

La même valeur doit être mise dans Netlify sous `BILLET_API_SECRET`.

## 4 — Étape importante : lancer setup()
Dans la barre en haut de l’éditeur Apps Script, sélectionne la fonction **`setup`**, puis clique sur **Exécuter**.

Google te demandera d’autoriser l’accès au Sheet. Accepte.

`setup()` :
- mémorise explicitement l’ID de ce Google Sheet ;
- crée les onglets `Billets` et `Corpus` ;
- évite de dépendre de `getActiveSpreadsheet()` pendant les appels de la Web App.

Tu dois voir `Billets` et `Corpus` apparaître dans ton Google Sheet.

## 5 — Déployer comme Web App
**Déployer > Nouveau déploiement > Application Web**

- Exécuter en tant que : **Moi**
- Qui a accès : **Tout le monde** / **Anyone**

Copie l’URL qui finit par `/exec`.

## 6 — Netlify
Dans les variables d’environnement :

- `GOOGLE_SCRIPT_URL` = URL `/exec`
- `BILLET_API_SECRET` = exactement le même secret

Puis redéploie le site.

## 7 — Diagnostic
Après déploiement, ouvre :

`https://TON-SITE.netlify.app/api/health`

Si tout va bien, tu obtiens notamment :

```json
{"ok":true,"netlify":true,"apps_script":true,"sheet_ready":true}
```

Cette route ne révèle ni le secret ni l’URL Apps Script.
