/** Messages d'erreur courants, à partir du code renvoyé par la couche de données. */
export function loadErrorMessage(code: string | null, what: string): string {
  if (code === "unreachable") return "Mijoté ne rejoint pas le serveur. Vérifie ta connexion, puis réessaie.";
  return `Un souci est survenu en chargeant ${what}. Réessaie dans un instant.`;
}

export function saveErrorMessage(code: string | null): string {
  if (code === "unreachable") return "Pas de connexion au serveur : rien n'a été enregistré. Réessaie.";
  if (code === "invalid_city") return "Cette municipalité n'est pas reconnue.";
  if (code === "invalid" || code === "invalid_postal") return "Certaines valeurs ne sont pas valides. Vérifie les champs, puis réessaie.";
  return "L'enregistrement n'a pas fonctionné. Réessaie dans un instant.";
}
