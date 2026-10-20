# Dashboard personnel mobile (étape 3)

## Données réelles et données de démonstration

- **Compte connecté** (session `api`) : tout vient du backend (profil, favoris, recettes sauvegardées, listes, recommandation du jour, catalogue). Les statistiques de l'accueil sont calculées à partir de ces collections ; tant qu'elles ne sont pas chargées (ou en cas d'erreur) la carte affiche « — », jamais un faux zéro.
- **Mode démonstration** (session `demo`) : recettes d'exemple et données gardées en mémoire sur l'appareil, le temps de la session. Un bandeau le signale. Rien n'est envoyé au serveur.
- La couche de services est isolée dans `mobile/src/data/services/` (`remote.ts`, `demo.ts`, interface `types.ts`).

## Points d'accès (tous authentifiés par jeton Bearer)

| Route | Rôle |
| --- | --- |
| `GET/PUT /api/profile` | Profil complet (le PUT attend l'objet entier) |
| `GET /api/geo` | Recherche de municipalités (Canada seulement) |
| `GET /api/mobile/du-jour` | Recommandation du repas, filtrée par allergènes |
| `GET /api/mobile/favoris` | Favoris (cœur), avec avertissements d'allergène |
| `GET/POST /api/mobile/sauvegardes` | Recettes sauvegardées (signet), distinctes des favoris ; POST `{recipeId, saved}` |
| `GET /api/mobile/recettes` | Catalogue filtré par allergènes (+ nombre de recettes masquées) |
| `GET/POST /api/mobile/listes` | Listes d'épicerie nommées : GET (`?id=` pour le détail) ; POST avec `action` = `create`, `rename`, `delete`, `addItem`, `addRecipe`, `check`, `deleteItem`, `clearChecked` |

Limites : 50 listes par compte, 300 articles par liste ; noms uniques par compte.

## Allergies et préférences

- Les **allergies** (allergènes déclarés) sont distinguées visuellement (ton rouge, section dédiée) des **ingrédients à éviter**, qui sont de simples préférences.
- Filtrage en trois couches : serveur (du-jour, catalogue), client (`filterSafe`, `visibleCatalog`) et avertissements explicites sur les favoris, sauvegardes et fiches (« Contient : … », « Peut contenir : … »).
- Retirer une allergie demande une confirmation. Après un enregistrement, l'app signale les favoris ou sauvegardes devenus à risque.

## Ce qui reste à configurer ou à noter

- Même configuration que l'étape 2 pour Google et Twilio (voir `docs/authentification.md`) ; l'étape 3 n'ajoute aucune variable d'environnement.
- Les tables `saved_recipes`, `shopping_lists` et `shopping_list_items` sont créées automatiquement (`CREATE TABLE IF NOT EXISTS` dans `src/server/db/schema.ts`), y compris sur une base existante.
- Région/municipalité : recherche disponible pour le Canada seulement et pas en démonstration.
- La liste d'épicerie hebdomadaire automatique reste sur le site web ; l'app gère ses propres listes nommées.
- Expo Go sur le téléphone doit être compatible avec le SDK 58.
