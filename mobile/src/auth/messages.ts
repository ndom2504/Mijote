/** Messages d'erreur d'authentification. Aucun ne révèle si un compte existe déjà. */

export function formatWait(seconds: number | undefined): string {
  if (!seconds || seconds <= 0) return "quelques minutes";
  if (seconds < 60) return `${Math.ceil(seconds)} secondes`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "1 heure" : `${hours} heures`;
}

export function authErrorMessage(code: string, retryAfterSeconds?: number): string {
  switch (code) {
    case "invalid_phone":
      return "Ce numéro n'est pas valide. Vérifie l'indicatif et le numéro.";
    case "sms_unsupported":
      return "Ce numéro ne peut pas recevoir de SMS. Essaie avec un numéro de cellulaire.";
    case "phone_unavailable":
      return "La connexion par SMS n'est pas encore activée. Réessaie plus tard ou choisis une autre méthode.";
    case "rate_limited":
      return `Trop d'essais. Réessaie dans ${formatWait(retryAfterSeconds)}.`;
    case "invalid_code":
      return "Ce code n'est pas valide. Vérifie les six chiffres.";
    case "expired":
      return "Ce code a expiré. Demande un nouveau code.";
    case "provider_error":
      return "Le service d'envoi de SMS ne répond pas. Réessaie dans un instant.";
    case "identity_in_use":
      return "Cette identité est déjà associée à un autre compte.";
    case "google_failed":
      return "Google n'a pas pu confirmer ton identité. Réessaie.";
    case "google_unavailable":
      return "La connexion Google n'est pas encore activée sur le serveur.";
    case "email_in_use":
      return "Un compte Mijoté existe déjà avec ce courriel. Connecte-toi avec ta méthode habituelle.";
    case "account_unavailable":
      return "Ce compte n'est pas disponible.";
    case "unreachable":
    case "network":
      return "Mijoté ne rejoint pas le serveur. Vérifie ta connexion et réessaie.";
    case "email_taken":
      return "Ce courriel a déjà un compte. Choisis « J'ai déjà un compte ».";
    case "password_short":
      return "Le mot de passe doit contenir au moins 10 caractères.";
    case "password_mismatch":
      return "Les deux mots de passe ne correspondent pas.";
    case "invalid_login":
      return "Ce courriel ou ce mot de passe ne correspond pas.";
    default:
      return "La connexion n'a pas abouti. Réessaie.";
  }
}

export function googleUnavailableMessage(reason: "web" | "expo_go" | "not_configured"): string {
  switch (reason) {
    case "web":
      return "La connexion Google est disponible dans l'application Android et iOS.";
    case "expo_go":
      return "La connexion Google demande une version de développement de Mijoté (Expo Go ne la prend pas en charge).";
    default:
      return "La connexion Google n'est pas encore configurée dans cette version de l'application.";
  }
}
