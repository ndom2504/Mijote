/** Configuration d'authentification de l'application, lue une seule fois depuis l'environnement. */
export const authConfig = {
  /** Client OAuth « Web » : son identifiant sert d'audience au jeton Google vérifié par le serveur. */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
  /** Client OAuth iOS, facultatif selon la configuration Google Cloud. */
  googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  /** Longueur du code de vérification (doit correspondre au service Twilio Verify). */
  codeLength: 6,
  /** Délai affiché avant de pouvoir renvoyer un code, tant que le serveur ne donne pas le sien. */
  defaultResendSeconds: 30,
  /** Délai avant la redirection automatique de l'écran de succès. */
  successDelayMs: 1600,
} as const;
