# Saint-Valentin — pack Netlify v1.4

## Parcours

1. L’utilisateur feuillette les illustrations.
2. Il clique sur une carte : retournement modéré (`1.12 s`) et écriture au verso.
3. Message limité à 4 lignes visuelles / 170 caractères + signature.
4. Il clique sur `Envoyer` : création d’un billet et d’un slug dérivé de la signature.
5. Exemple : `billet.coucouaurelien.com/amandine`, puis `amandine-2`, `amandine-3`, etc.
6. Rien n’est envoyé automatiquement. L’utilisateur partage le lien lui-même via le partage natif ou en le copiant.
7. Le destinataire voit d’abord l’illustration puis clique pour retourner la carte et lire le message.

## Ajouter des illustrations

Il n’y a plus de tableau de cartes à modifier à la main.

- Dépose simplement les `.png`, `.jpg`, `.jpeg`, `.webp` ou `.avif` dans `site/assets/cards/`.
- À chaque build Netlify, `scripts/build-cards.mjs` scanne le dossier et régénère `site/cards.generated.js`.
- Le nom du fichier sert automatiquement de libellé interne.

Les 3 riso actuellement disponibles sont déjà incluses. Si d’autres images sont présentes dans ton dépôt au moment du build, elles seront ajoutées automatiquement.

## Google Sheet : ce qui est enregistré

### Onglet `Billets` — fonctionnement et mesure
- identifiant technique aléatoire ;
- date de création ;
- slug et numéro de doublon ;
- illustration choisie ;
- signature ;
- message ;
- nombre de caractères, mots, lignes saisies et lignes réellement occupées visuellement ;
- retours à la ligne ;
- emojis ;
- `!`, `?`, points de suspension ;
- temps approximatif passé à composer le billet, plafonné à 1 h ;
- consentement à la réutilisation artistique + version du texte de consentement ;
- nombre de visites ;
- première / dernière visite ;
- nombre de révélations du verso ;
- première / dernière révélation ;
- délai entre création et première révélation ;
- nombre d’actions de partage ;
- dernière action de partage ;
- version de l’app.

L’app ne demande ni compte, ni e-mail, ni téléphone, ni géolocalisation et n’enregistre dans le Sheet ni IP, ni user-agent, ni referrer.

### Onglet `Corpus` — matière artistique
Créé uniquement si la personne coche : « J’accepte que mon message, sans ma signature, puisse nourrir de futurs projets artistiques. »

Il contient uniquement :
- un identifiant de corpus indépendant ;
- date de création ;
- illustration choisie ;
- texte ;
- métriques de forme (longueur, mots, lignes saisies et visuelles, emojis, ponctuation, temps de composition) ;
- version du consentement.

Il ne contient **ni signature, ni slug, ni identifiant du billet**. C’est cet onglet qu’il faut utiliser pour une future analyse éditoriale ou artistique.

## Important sur les liens

Le format demandé (`/amandine`, `/amandine-2`…) est volontairement simple et beau, mais il est aussi devinable. `noindex` empêche l’indexation par les moteurs de recherche ; il ne transforme pas l’URL en secret cryptographique. Si un jour tu veux des billets réellement difficiles à deviner, il faudra ajouter un petit suffixe aléatoire.

## Déploiement

1. Mets ce dossier dans ton dépôt Git connecté à Netlify.
2. Mets tes illustrations dans `site/assets/cards/`.
3. Suis `google-apps-script/README.md` pour brancher un Google Sheet vide.
4. Dans Netlify, renseigne `GOOGLE_SCRIPT_URL` et `BILLET_API_SECRET`.
5. Rattache `billet.coucouaurelien.com` au site.
6. Netlify exécute `npm run build`, détecte automatiquement les cartes, puis publie `site/`.

Le code des fonctions utilise le format moderne `Request` / `Response` des Netlify Functions.


## Réutilisation artistique
La v1.3 ne présente pas de case à cocher dans l’interface. L’information sur la réutilisation artistique des mots doit être communiquée clairement en amont de la création du billet. Le site enregistre chaque message dans `Corpus` sans signature, slug ni identifiant de billet réutilisable.

## Diagnostic backend
Après le déploiement, ouvre `/api/health`. Cette route vérifie sans révéler les secrets : variables Netlify → Apps Script → Google Sheet.

Avant le premier déploiement, exécute impérativement `setup()` une fois dans Apps Script.
