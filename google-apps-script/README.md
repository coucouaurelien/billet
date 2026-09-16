# Google Sheet — branchement

Tu peux partir d’un Google Sheet totalement vide : le script crée lui-même les onglets `Billets` et `Corpus` et leurs colonnes.

1. Crée un Google Sheet vide, par exemple `Billets Saint-Valentin`.
2. Extensions → Apps Script.
3. Remplace le contenu de `Code.gs` par le fichier `Code.gs` fourni ici.
4. Apps Script → Paramètres du projet → Propriétés du script : crée `BILLET_API_SECRET` avec une longue chaîne aléatoire.
5. Déployer → Nouveau déploiement → Application Web. Exécuter en tant que toi. Donne l’accès nécessaire pour que l’appel serveur Netlify puisse atteindre le script.
6. Copie l’URL `/exec` du déploiement.
7. Dans Netlify, ajoute :
   - `GOOGLE_SCRIPT_URL` = URL `/exec`
   - `BILLET_API_SECRET` = exactement le même secret
8. Redéploie Netlify.

## Les deux onglets

### Billets
Onglet opérationnel : il contient ce qui permet d’afficher les billets et de compter les usages. Il comprend donc la signature et le slug public.

### Corpus
Onglet artistique : une ligne n’y est créée que si la case de consentement est cochée. Il ne contient ni signature, ni slug, ni identifiant du billet, ni IP, ni e-mail, ni téléphone, ni appareil. Il garde le texte, l’illustration choisie et quelques caractéristiques formelles du message.
