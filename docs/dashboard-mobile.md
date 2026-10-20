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

| `GET/PUT/DELETE /api/mobile/avatar` | Photo de profil : GET `{avatar:{uri,updatedAt}|null}`, PUT `{image}` (base64 d'un JPEG, PNG ou WebP, 400 Ko décodés au plus), DELETE |
| `GET /api/mobile/epiceries` | Épiceries du Canada : sans paramètre, lieu déduit du profil ; avec `?lat&lon&province&label`, lieu choisi |
| `GET /api/mobile/epiceries/lieux?q=` | Recherche d'une ville, d'un quartier ou d'un code postal canadien |

Limites : 50 listes par compte, 300 articles par liste ; noms uniques par compte.

## Allergies et préférences

- Les **allergies** (allergènes déclarés) sont distinguées visuellement (ton rouge, section dédiée) des **ingrédients à éviter**, qui sont de simples préférences.
- Filtrage en trois couches : serveur (du-jour, catalogue), client (`filterSafe`, `visibleCatalog`) et avertissements explicites sur les favoris, sauvegardes et fiches (« Contient : … », « Peut contenir : … »).
- Retirer une allergie demande une confirmation. Après un enregistrement, l'app signale les favoris ou sauvegardes devenus à risque.

## Photo de profil

- L'app (galerie ou appareil photo) recadre en carré, réduit à 512 px et compresse en JPEG avant l'envoi (`mobile/src/lib/avatarPicker.ts`) : quelques dizaines de Ko.
- Le serveur ne fait pas confiance au type annoncé : il vérifie les octets d'en-tête (JPEG, PNG, WebP seulement ; SVG et le reste sont refusés), plafonne la taille et limite à 10 envois par minute. La photo est stockée dans `user_avatars` (une par compte, supprimée avec le compte).
- En démonstration, la photo reste en mémoire. Sans photo, ce sont les initiales qui s'affichent.
- Le plugin `expo-image-picker` (textes d'autorisation en français) est déclaré dans `mobile/app.json` : un nouveau build natif est nécessaire pour une version autonome ; Expo Go suffit en développement.

## Épiceries du Canada

La liste n'est pas figée : elle se construit à la demande, selon la zone de la personne.

1. **Lieu** : code postal du profil (zone de 3 caractères, via Zippopotam.us), sinon municipalité du profil (Québec), sinon lieu choisi dans l'app (ville, quartier ou code postal, via Nominatim d'OpenStreetMap). Le lieu choisi reste sur l'appareil et s'efface à la déconnexion. Aucun GPS n'est demandé.
2. **Commerces** : supermarchés et épiceries trouvés par Nominatim dans un rectangle centré sur le lieu, élargi par paliers (≈ 5, 13 puis 33 km) tant qu'il y a moins de 4 résultats (régions peu denses). Résultats triés par distance, au plus 15, avec adresse et site web quand ils existent (liens http(s) seulement).
3. **Bannières courantes** : annuaire intégré par province (`src/server/stores/chains.ts`), affiché même sans réseau. Il est indicatif : il ne dit pas qu'un magasin précis existe à un endroit donné.
4. **Cache** : table `place_cache` (14 jours pour les commerces, 90 jours pour les lieux). Si le service en ligne tombe, une entrée périmée est servie en l'indiquant à l'écran ; sans cache, on affiche les bannières de la province.
5. **Respect des services ouverts** : une requête par seconde au plus (file commune), User-Agent explicite, mention « © contributeurs OpenStreetMap (ODbL) » à l'écran.

Variables facultatives : `NOMINATIM_URL` (instance Nominatim personnelle, recommandée si le trafic augmente) et `MIJOTE_CONTACT` (courriel ou site de contact ajouté au User-Agent, demandé par la politique de Nominatim).

Limites connues : les heures d'ouverture ne sont pas affichées (le format OpenStreetMap n'est pas fiable à l'affichage brut) ; la couverture dépend de la complétude d'OpenStreetMap, très bonne dans les grandes villes et inégale ailleurs ; le serveur Overpass public, essayé d'abord, était trop lent et n'est pas utilisé.

## Ce qui reste à configurer ou à noter

- Même configuration que l'étape 2 pour Google et Twilio (voir `docs/authentification.md`) ; l'étape 3 n'ajoute aucune variable d'environnement.
- Les tables `saved_recipes`, `shopping_lists` et `shopping_list_items` sont créées automatiquement (`CREATE TABLE IF NOT EXISTS` dans `src/server/db/schema.ts`), y compris sur une base existante.
- Région/municipalité : recherche disponible pour le Canada seulement et pas en démonstration.
- La liste d'épicerie hebdomadaire automatique reste sur le site web ; l'app gère ses propres listes nommées.
- Expo Go sur le téléphone doit être compatible avec le SDK 58.
