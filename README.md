# Mijoté

Bien manger, simplement. Application de planification des repas (déjeuner, dîner, souper) pour les particuliers de toutes les municipalités du Québec.

## Prérequis

- Node.js 20 ou plus récent
- npm

PostgreSQL externe est facultatif. Sans `DATABASE_URL`, Mijoté ouvre une base PostgreSQL embarquée (PGlite) dans `data/pglite`.

## Installation

```bash
npm install
copy .env.example .env
npm test
npm run dev
```

L'application web est alors disponible sur `http://localhost:3000`.

## Application mobile (Android et iOS)

Le dossier `mobile` est une application Expo. Elle joue la vidéo de démarrage, puis propose **une** recette : déjeuner avant 11 h, dîner de 11 h à 16 h, souper ensuite. Le pays choisi à l'inscription oriente la cuisine. Si le catalogue n'a pas de recette documentée pour ce pays et ce repas, une recette d'une autre cuisine est proposée, et l'écran le dit.

```bash
npm run dev
cd mobile
npx expo start
```

### Écran d'accueil mobile

L'accueil reprend la maquette : logo, sélecteur de pays, notifications, salutation selon l'heure, grande carte de la recette du jour (repas, origine, temps de préparation et de cuisson, portions, niveau, favori), cartes « Explorer plus » et navigation à cinq onglets. Les onglets Recettes et Épicerie, la carte Voyage culinaire et les notifications sont des écrans provisoires, identifiés comme tels.

- `mobile/src/components` : composants réutilisables (carte, en-tête, onglets, sélecteur de pays, états de chargement, d'erreur et de contenu vide).
- `mobile/src/screens` : accueil, fiche recette, favoris, profil, écrans provisoires, connexion.
- `mobile/src/data` : API réelle (`recipeRepository.ts`) et données de démonstration isolées dans `data/demo/`.
- `mobile/src/config/mealWindows.ts` : plages horaires des repas (déjeuner dès 5 h, dîner dès 11 h, souper dès 16 h). Elles se règlent par pays (`COUNTRY_MEAL_WINDOWS`, vide tant qu'aucune habitude n'est documentée) et par utilisateur.
- Mode démonstration : lien « Développement : voir la démonstration » sur l'écran de bienvenue (versions de développement seulement), ou `EXPO_PUBLIC_DATA_SOURCE=demo` pour démarrer sans serveur. Les recettes d'exemple n'ont aucune vérification d'allergies.
- Les tests de la logique mobile s'exécutent avec `npm test` à la racine ; le typage avec `npx tsc --noEmit` dans `mobile`.

L'application parle à l'API locale. Sur un téléphone, définissez `EXPO_PUBLIC_API_URL` avec l'adresse de l'ordinateur, par exemple `http://192.168.x.x:3001`. L'émulateur Android utilise souvent `http://10.0.2.2:3001`. Ce réglage n'apparaît pas dans le formulaire. iOS se construit sur un Mac, ou via l'application Expo Go. Aucune clé de magasin n'est requise pour cet essai.

Le premier démarrage charge 1 281 municipalités et 60 recettes. Comptez quelques secondes.

### Connexion mobile : Google et SMS

L'écran de bienvenue propose **Continuer avec Google**, **Continuer avec mon téléphone** (SMS par Twilio Verify) et la connexion par courriel. Google et Twilio demandent des identifiants que vous créez vous-même : tant qu'ils ne sont pas configurés, l'application l'indique au lieu de faire semblant. Configuration, variables d'environnement et marche à suivre pour tester : [docs/authentification.md](docs/authentification.md). L'état réel des fournisseurs se lit sur `GET /api/auth/providers`.

## Variables d'environnement

| Variable | Rôle |
| --- | --- |
| `DATABASE_URL` | PostgreSQL externe (`postgres://...`). Vide : PGlite local. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Crée un administrateur si le courriel n'existe pas encore. Mot de passe d'au moins 10 caractères. |
| `PASSWORD_RESET_DEBUG` | En développement seulement, affiche le jeton de réinitialisation. Le serveur refuse de démarrer si cette valeur est `true` et `NODE_ENV=production`. |
| `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` | Assistant facultatif, côté serveur uniquement. Sans clé, le catalogue et les règles suffisent. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Envoi réel des codes et des rappels. Sans ces variables, aucun courriel n'est simulé : le code de vérification s'affiche une fois à l'inscription. |
| `BCRYPT_ROUNDS` | Coût du hachage des mots de passe. Défaut : 12. |

Ne commitez pas `.env`.

## Compte de test

En développement, un compte déjà vérifié est créé au démarrage :

- Courriel : `demo@mijote.local`
- Mot de passe : `Mijote-Demo-2026!`
- Pays : Canada

Il sert au site et à l'application mobile. Il n'est pas créé lorsque `NODE_ENV` vaut `production`.

## Comptes et parcours

1. Créer un compte, puis saisir le code de vérification.
2. Remplir le profil alimentaire. La municipalité se cherche dans le répertoire du Québec. Le GPS n'est pas demandé.
3. Le tableau Aujourd'hui propose trois repas. Une allergie enregistrée retire les recettes incompatibles connues avant tout classement.
4. Remplacer un repas, l'aimer, l'enregistrer en favori.
5. La liste d'épicerie fusionne les ingrédients de la semaine. Les unités incompatibles sont signalées, pas additionnées.
6. Les notifications sont désactivées par défaut et n'apparaissent que lorsque vous ouvrez l'application après l'heure choisie.

L'espace `/admin` n'est accessible qu'au rôle administrateur.

## Tests

```bash
npm test
npm run typecheck
```

Les tests couvrent le moteur (allergies avant le score), l'épicerie, la recherche de municipalités, le catalogue et un parcours mémoire : inscription, isolation entre deux comptes, remplacement, favori, portions et suppression.

## Déploiement

1. Fournir une base PostgreSQL persistante via `DATABASE_URL`, ou un disque persistant pour `data/pglite`. Un conteneur sans volume perd les comptes au redémarrage.
2. Servir l'application en HTTPS derrière un proxy. Laisser `PASSWORD_RESET_DEBUG` vide.
3. Définir `ADMIN_EMAIL` et `ADMIN_PASSWORD` avant le premier démarrage, puis retirer le mot de passe de l'environnement si vous le souhaitez : le compte déjà créé reste.
4. Configurer SMTP pour les vrais courriels. Configurer `AI_API_KEY` seulement si vous voulez les variantes. Les variantes restent invisibles tant qu'un administrateur ne les a pas relues, et l'IA ne décide pas seule des allergies.
5. Commandes : `npm run build` puis `npm start`.
6. Au proxy, ajouter une politique de sécurité du contenu stricte. Les photos du catalogue viennent d'Unsplash ; un blocage de ce domaine affiche un fond de remplacement.

## Données et limites

- Les coûts sont des estimations internes datées (`estimation_interne`, 2026-10-19). Ce ne sont pas des prix d'épicerie.
- Aucune tendance locale en temps réel n'est inventée. La saison et le profil suffisent, et l'interface le dit.
- Les valeurs nutritionnelles mesurées ne sont pas fabriquées. Les marqueurs décrivent la composition connue.
- Les municipalités viennent du répertoire du ministère des Affaires municipales et de l'Habitation (CC-BY 4.0). Voir `data/ATTRIBUTION.txt`. Le code postal est celui du siège, pas la liste de toutes les adresses.
- Mijoté n'est pas un service médical et ne garantit pas l'absence d'un allergène non documenté.
