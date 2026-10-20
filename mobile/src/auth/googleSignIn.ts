/**
 * Connexion Google native (Android et iOS). Seul le jeton d'identité (ID token) quitte cette
 * fonction : il est envoyé au serveur, qui le vérifie. Le mot de passe Google n'est jamais vu
 * par l'application.
 *
 * Le module natif n'existe pas dans Expo Go ni sur le web : il est chargé à la demande, et son
 * absence produit un résultat « indisponible » explicite plutôt qu'un plantage.
 */

export type GoogleResult =
  | { status: "success"; idToken: string }
  | { status: "cancelled" }
  | { status: "unavailable"; reason: "web" | "expo_go" | "not_configured" }
  | { status: "error"; reason: "play_services" | "network" | "unknown" };

interface NativeGoogleModule {
  GoogleSignin: {
    configure(options: { webClientId?: string; iosClientId?: string }): void;
    hasPlayServices(options?: { showPlayServicesUpdateDialog?: boolean }): Promise<boolean>;
    signIn(): Promise<{ type?: string; data?: { idToken?: string | null } | null }>;
    signOut(): Promise<unknown>;
  };
  statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
}

export interface GoogleDeps {
  platform: string;
  webClientId?: string;
  iosClientId?: string;
  load: () => NativeGoogleModule | null;
}

function readError(error: unknown): { code: string; message: string } {
  const source = (error ?? {}) as { code?: unknown; message?: unknown };
  return { code: String(source.code ?? ""), message: String(source.message ?? "") };
}

export async function signInWithGoogle(deps: GoogleDeps): Promise<GoogleResult> {
  if (deps.platform === "web") return { status: "unavailable", reason: "web" };
  if (!deps.webClientId) return { status: "unavailable", reason: "not_configured" };
  const native = deps.load();
  if (!native?.GoogleSignin) return { status: "unavailable", reason: "expo_go" };

  const { GoogleSignin, statusCodes } = native;
  try {
    GoogleSignin.configure({ webClientId: deps.webClientId, iosClientId: deps.iosClientId });
    if (deps.platform === "android") await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (response.type === "cancelled") return { status: "cancelled" };
    const idToken = response.data?.idToken;
    if (!idToken) return { status: "error", reason: "unknown" };
    // La session Google locale n'est pas conservée : Mijoté gère sa propre session.
    void GoogleSignin.signOut().catch(() => undefined);
    return { status: "success", idToken };
  } catch (error) {
    const { code, message } = readError(error);
    if (code === statusCodes.SIGN_IN_CANCELLED) return { status: "cancelled" };
    if (code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) return { status: "error", reason: "play_services" };
    if (code === "7" || code === "NETWORK_ERROR" || /network/i.test(message)) return { status: "error", reason: "network" };
    return { status: "error", reason: "unknown" };
  }
}

export function googleErrorMessage(reason: "play_services" | "network" | "unknown"): string {
  if (reason === "play_services") return "Les services Google Play sont absents ou à mettre à jour sur cet appareil.";
  if (reason === "network") return "Connexion impossible. Vérifie ton accès à Internet et réessaie.";
  return "La connexion avec Google n'a pas abouti. Réessaie.";
}
