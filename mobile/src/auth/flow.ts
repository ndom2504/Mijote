/**
 * Machine d'états de la navigation d'authentification.
 * Fonction pure : chaque écran n'est atteignable que par un événement précis, ce qui rend les
 * redirections testables et empêche les boucles (l'écran de succès n'a aucune sortie sauf « reset »).
 */

export type AuthScreen = "welcome" | "email" | "phone" | "code" | "success";
export type AuthVia = "google" | "phone" | "email";

export interface AuthFlowState {
  screen: AuthScreen;
  /** Numéro E.164 en cours de vérification. */
  phone: string | null;
  /** Instant (ms) à partir duquel le renvoi du code est permis. */
  resendAt: number | null;
  token: string | null;
  isNewUser: boolean;
  via: AuthVia | null;
}

export type AuthEvent =
  | { type: "choose_phone" }
  | { type: "choose_email" }
  | { type: "back" }
  | { type: "code_sent"; phone: string; resendAt: number }
  | { type: "resend_scheduled"; resendAt: number }
  | { type: "change_number" }
  | { type: "signed_in"; token: string; isNewUser: boolean; via: AuthVia }
  | { type: "reset" };

export const initialAuthState: AuthFlowState = {
  screen: "welcome",
  phone: null,
  resendAt: null,
  token: null,
  isNewUser: false,
  via: null,
};

export function authReducer(state: AuthFlowState, event: AuthEvent): AuthFlowState {
  if (event.type === "reset") return initialAuthState;

  // Une fois connecté, aucun événement ne ramène en arrière : la sortie se fait par `onAuthenticated`.
  if (state.screen === "success") return state;

  if (event.type === "signed_in") {
    return { ...state, screen: "success", token: event.token, isNewUser: event.isNewUser, via: event.via, resendAt: null };
  }

  switch (state.screen) {
    case "welcome":
      if (event.type === "choose_phone") return { ...state, screen: "phone" };
      if (event.type === "choose_email") return { ...state, screen: "email" };
      return state;
    case "email":
      return event.type === "back" ? { ...state, screen: "welcome" } : state;
    case "phone":
      if (event.type === "back") return { ...state, screen: "welcome" };
      if (event.type === "code_sent") return { ...state, screen: "code", phone: event.phone, resendAt: event.resendAt };
      return state;
    case "code":
      if (event.type === "back" || event.type === "change_number") return { ...state, screen: "phone", resendAt: null };
      if (event.type === "resend_scheduled") return { ...state, resendAt: event.resendAt };
      return state;
    default:
      return state;
  }
}

/** Secondes restantes avant le prochain renvoi permis (0 = renvoi possible). */
export function secondsRemaining(resendAt: number | null, now: number): number {
  if (resendAt === null) return 0;
  return Math.max(0, Math.ceil((resendAt - now) / 1000));
}

export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Texte de l'écran de succès selon la manière de se connecter. */
export function successCopy(isNewUser: boolean, via: AuthVia | null): { title: string; text: string } {
  const how = via === "google" ? "avec Google" : via === "phone" ? "avec ton numéro" : "avec ton courriel";
  return isNewUser
    ? { title: "Bienvenue chez Mijoté !", text: `Ton compte est créé ${how}. On prépare ta première recette.` }
    : { title: "Content de te revoir !", text: `Tu es connecté ${how}. On retrouve ta recette du jour.` };
}
