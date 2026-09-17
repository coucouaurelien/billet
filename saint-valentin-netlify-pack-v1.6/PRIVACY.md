# Vie privée — choix de conception

Cette v1 est pensée sans compte utilisateur et sans outil d’analytics tiers.

## L’application n’enregistre pas dans Google Sheets
- e-mail ;
- téléphone ;
- adresse postale ;
- IP ;
- user-agent / modèle d’appareil ;
- géolocalisation ;
- referrer ;
- compte social ;
- cookie publicitaire ou identifiant cross-site.

La seule information ressemblant à une identité est la **signature choisie par l’auteur**, nécessaire pour signer le billet et former le slug public demandé (`/amandine`, `/amandine-2`, etc.). Une personne peut donc signer d’un prénom, d’un surnom ou d’un pseudo.

## Réutilisation artistique
Le texte du billet est toujours conservé dans `Billets`, car il faut le servir au destinataire. Il n’est recopié dans `Corpus` que lorsque la case de consentement est cochée. `Corpus` omet la signature, le slug et l’identifiant opérationnel du billet.

Cette séparation fournit une surface de travail propre pour l’analyse artistique, mais ce n’est pas une anonymisation cryptographique : le texte original existe nécessairement dans l’onglet opérationnel tant que le billet existe.

## Infrastructure
Netlify et Google peuvent conserver leurs propres journaux techniques selon leurs services et réglages. Le code de cette application ne copie pas ces journaux dans le Sheet.

## Liens
`noindex` évite l’indexation volontaire par les moteurs de recherche. Un lien basé uniquement sur un prénom reste toutefois devinable ; il ne doit pas être présenté comme un secret fort.
