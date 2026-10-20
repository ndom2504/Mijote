# Authentification Google et SMS (Twilio Verify)

Ce document explique comment activer, configurer et tester la connexion de l'application mobile. Rien n'est préconfiguré : **sans les identifiants ci-dessous, « Continuer avec Google » et « Continuer avec mon téléphone » affichent honnêtement qu'ils ne sont pas disponibles**. L'état réel se lit sur `GET /api/auth/providers` (booléens seulement, aucun secret).

## Vue d'ensemble

| Élément | Où | Rôle |
| --- | --- | --- |
| Écrans (bienvenue, numéro, code, succès) | `mobile/src/screens/auth/` | Interface ; aucun secret |
| Machine d'états de navigation | `mobile/src/auth/flow.ts` | Redirections, sans boucle |
| Google côté appareil | `mobile/src/auth/googleSignIn.ts`, `googleNative.ts` | Obtient un **jeton d'identité** Google ; jamais le mot de passe |
| Vérification Google | `src/server/auth/google.ts` | Contrôle signature RS256 (clés JWKS Google), émetteur, audience, expiration, courriel vérifié |
| Twilio Verify | `src/server/auth/twilio.ts` | Envoi et contrôle du code par l'API REST ; secrets côté serveur uniquement |
| Comptes et identités | `src/server/auth/identity.ts` | Création ou retrouvailles du compte, liaison explicite |
| Limites d'essais | `src/server/auth/throttle.ts` | Table `auth_attempts` (clés hachées) |
| Sessions | `src/server/auth/service.ts` | Jeton aléatoire, empreinte SHA-256 en base, expiration à 30 jours, déconnexion |

Règles appliquées :

- Aucun compte n'est lié automatiquement sur la base d'un courriel ou d'un numéro non vérifié. Un courriel Google vérifié qui correspond à un compte existant donne l'erreur `email_in_use` (aucun compte créé, aucune liaison). La liaison se fait seulement depuis une session ouverte (`POST /api/auth/link-google`, `POST /api/auth/link-phone`).
- L'envoi d'un code répond de la même façon pour un numéro connu ou inconnu.
- Le succès n'est affiché qu'après une validation réelle côté serveur.
- Les routes Google et SMS sont réservées au client mobile (en-tête `X-Mijote-Client: mobile`).

## 1. Variables d'environnement du serveur

Copier `.env.example` vers `.env` (jamais commité : `.env` et `.env.*` sont dans `.gitignore`, sauf `.env.example`).

| Variable | Obligatoire | Rôle |
| --- | --- | --- |
| `GOOGLE_CLIENT_IDS` | Pour Google | Identifiants client OAuth acceptés comme audience, séparés par des virgules (client Web, et client iOS si utilisé) |
| `TWILIO_ACCOUNT_SID` | Pour SMS | Commence par `AC`, 34 caractères |
| `TWILIO_AUTH_TOKEN` | Pour SMS | Secret : serveur seulement |
| `TWILIO_VERIFY_SERVICE_SID` | Pour SMS | Commence par `VA`, 34 caractères |
| `AUTH_PHONE_RESEND_SECONDS` | Non | Délai avant renvoi (30 par défaut) |
| `AUTH_PHONE_SENDS_PER_HOUR` / `_PER_HOUR_PER_IP` | Non | Envois par heure par numéro (5) et par adresse IP (20) |
| `AUTH_PHONE_CHECKS_PER_10_MIN` / `_PER_IP` | Non | Essais de code par 10 min par numéro (5) et par IP (30) |

Une configuration Twilio dont le format est invalide est traitée comme absente.

## 2. Google Cloud Console

1. Créer (ou choisir) un projet sur <https://console.cloud.google.com>, puis configurer l'**écran de consentement OAuth** (nom de l'application, courriel d'assistance, liens vers les conditions et la confidentialité de Mijoté). Portées demandées : `email`, `profile` (par défaut).
2. **Identifiants → Créer des identifiants → ID client OAuth** :
   - **Application Web** : son identifiant est l'audience du jeton. Le copier dans `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (mobile) et dans `GOOGLE_CLIENT_IDS` (serveur).
   - **Android** : nom de package `ca.mijote.app` et **empreinte SHA-1** du certificat de signature (voir ci-dessous).
   - **iOS** : identifiant de bundle `ca.mijote.app`. Copier l'identifiant client dans `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` **et** dans `GOOGLE_CLIENT_IDS`, puis le « schéma d'URL inversé » (`com.googleusercontent.apps.…`) dans `GOOGLE_IOS_URL_SCHEME`.
3. Empreinte SHA-1 :
   - Développement local : `keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android`
   - Production : l'empreinte du certificat de signature (avec EAS : `eas credentials`, et avec Google Play App Signing, l'empreinte affichée dans la console Play).
4. Utiliser **un projet (ou au moins des clients) distinct par environnement** : développement, préproduction, production. Chaque environnement a ses propres identifiants dans son propre `.env` ou ses variables d'hébergement.

## 3. Configuration mobile par environnement

Copier `mobile/.env.example` vers `mobile/.env` (ignoré par Git). Les variables `EXPO_PUBLIC_*` sont **visibles dans l'application** : n'y mettre aucun secret.

| Variable | Rôle |
| --- | --- |
| `EXPO_PUBLIC_API_URL` | Adresse de l'API (obligatoire en production). En développement, elle est déduite de l'ordinateur qui sert Expo. |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Client OAuth Web (Android et iOS) |
| `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` | Client OAuth iOS (facultatif) |
| `GOOGLE_IOS_URL_SCHEME` | Lu par `mobile/app.config.js` à la compilation : ajoute le plugin Google Sign-In avec le schéma d'URL iOS. Sans elle, le plugin n'est pas ajouté et l'application reste compilable. |

Google Sign-In est un **module natif** : il ne fonctionne ni dans Expo Go ni sur le web (l'écran l'explique). Il faut une version de développement :

```bash
cd mobile
npx expo install expo-dev-client      # une seule fois
npx expo run:android                  # ou: npx expo run:ios (macOS)
# ou, avec EAS : eas build --profile development --platform android
```

Pour la production, générer le build avec EAS (`eas build --profile production`) en fournissant les variables du mobile dans le profil de build, et publier le serveur avec ses propres variables.

## 4. Twilio Verify

1. Créer un compte sur <https://www.twilio.com>. Relever **Account SID** et **Auth Token** (console Twilio).
2. **Verify → Services → Créer** un service (nom : Mijoté). Dans ses paramètres, régler la **longueur du code à 6 chiffres** et activer le canal **SMS**. Relever le **Service SID** (`VA…`).
3. Renseigner `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` dans le `.env` du serveur uniquement.
4. Avec un compte d'essai, Twilio n'envoie des SMS qu'aux **numéros vérifiés** du compte. Pour tous les numéros, passer à un compte payant. Respecter les règles d'envoi par pays (autorisations géographiques de Verify) et les règles canadiennes d'envoi de messages.
5. Les messages sont envoyés en français (`Locale=fr`). Des frais de l'opérateur peuvent s'appliquer ; l'écran de saisie le mentionne.

## 5. Tester

### Sans service externe (automatique)

```bash
npx vitest run          # 112 tests, dont l'authentification
npx tsc --noEmit        # serveur
cd mobile && npx tsc --noEmit
```

Les tests utilisent de faux fournisseurs (Twilio simulé, clés Google générées pour le test). Ils prouvent la logique de Mijoté, pas la configuration de Google ni de Twilio.

### SMS réel

1. Renseigner les trois variables Twilio, redémarrer le serveur (`npm run dev`).
2. Vérifier : `GET http://localhost:3001/api/auth/providers` renvoie `"phone": true`.
3. Lancer l'application (`cd mobile && npx expo start`), choisir **Continuer avec mon téléphone**, saisir un numéro (vérifié si compte d'essai), puis le code reçu.
4. Contrôler : un nouveau compte est créé la première fois, le même compte est retrouvé ensuite ; un code faux affiche une erreur ; le renvoi n'est possible qu'après le délai ; après 5 mauvais codes, le serveur impose une attente.

### Google réel

1. Renseigner `GOOGLE_CLIENT_IDS` côté serveur et les variables Google côté mobile, redémarrer le serveur.
2. Vérifier : `GET /api/auth/providers` renvoie `"google": true`.
3. Compiler une version de développement (section 3) et choisir **Continuer avec Google** sur un appareil ou un émulateur avec Google Play.
4. Contrôler : première connexion = compte créé ; seconde = même compte ; fermer la fenêtre Google = message d'annulation ; mode avion = message de réseau.

## 6. Limites connues

- Les comptes sans mot de passe (Google ou téléphone) ne peuvent pas encore supprimer leur compte depuis l'application (la suppression exige le mot de passe).
- Aucun écran de liaison d'un second moyen de connexion : les routes `link-google` et `link-phone` existent et sont testées, l'interface reste à faire.
- Les conditions d'utilisation (`/conditions`) sont une version de départ à faire réviser par un professionnel du droit.
- Le serveur ne peut pas vérifier que la longueur du code du service Verify est de 6 chiffres : c'est un réglage Twilio.
