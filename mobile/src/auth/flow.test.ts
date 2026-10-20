import { describe, expect, it } from "vitest";
import {
  authReducer,
  formatCountdown,
  initialAuthState,
  secondsRemaining,
  successCopy,
  type AuthEvent,
  type AuthFlowState,
} from "./flow";

function run(events: AuthEvent[], from: AuthFlowState = initialAuthState): AuthFlowState {
  return events.reduce(authReducer, from);
}

describe("navigation d'authentification", () => {
  it("commence sur la bienvenue", () => {
    expect(initialAuthState.screen).toBe("welcome");
  });

  it("parcours téléphone : bienvenue → numéro → code → succès", () => {
    const state = run([
      { type: "choose_phone" },
      { type: "code_sent", phone: "+15145551234", resendAt: 5000 },
      { type: "signed_in", token: "tok", isNewUser: true, via: "phone" },
    ]);
    expect(state.screen).toBe("success");
    expect(state.token).toBe("tok");
    expect(state.isNewUser).toBe(true);
    expect(state.via).toBe("phone");
  });

  it("le code n'est pas accessible sans envoi réussi", () => {
    expect(run([{ type: "choose_phone" }, { type: "resend_scheduled", resendAt: 1 }]).screen).toBe("phone");
    expect(run([{ type: "change_number" }]).screen).toBe("welcome");
  });

  it("Google mène directement au succès depuis la bienvenue", () => {
    const state = run([{ type: "signed_in", token: "g", isNewUser: false, via: "google" }]);
    expect(state).toMatchObject({ screen: "success", token: "g", isNewUser: false, via: "google" });
  });

  it("modifier le numéro ou revenir ramène à la saisie et efface le délai de renvoi", () => {
    const atCode = run([{ type: "choose_phone" }, { type: "code_sent", phone: "+15145551234", resendAt: 9000 }]);
    expect(authReducer(atCode, { type: "change_number" })).toMatchObject({ screen: "phone", resendAt: null });
    expect(authReducer(atCode, { type: "back" })).toMatchObject({ screen: "phone", resendAt: null });
  });

  it("met à jour le délai de renvoi", () => {
    const atCode = run([{ type: "choose_phone" }, { type: "code_sent", phone: "+15145551234", resendAt: 9000 }]);
    expect(authReducer(atCode, { type: "resend_scheduled", resendAt: 20000 }).resendAt).toBe(20000);
  });

  it("le retour mène à la bienvenue et la bienvenue n'a pas de retour (aucune boucle)", () => {
    expect(run([{ type: "choose_email" }, { type: "back" }]).screen).toBe("welcome");
    expect(run([{ type: "choose_phone" }, { type: "back" }]).screen).toBe("welcome");
    expect(run([{ type: "back" }]).screen).toBe("welcome");
  });

  it("l'écran de succès ne se laisse ni quitter ni rejouer", () => {
    const success = run([{ type: "signed_in", token: "a", isNewUser: true, via: "google" }]);
    for (const event of [
      { type: "back" },
      { type: "choose_phone" },
      { type: "choose_email" },
      { type: "change_number" },
      { type: "signed_in", token: "b", isNewUser: false, via: "phone" },
    ] as AuthEvent[]) {
      expect(authReducer(success, event)).toBe(success);
    }
  });

  it("la déconnexion (reset) repart d'une bienvenue vierge, sans reste de session", () => {
    const success = run([{ type: "signed_in", token: "a", isNewUser: true, via: "google" }]);
    expect(authReducer(success, { type: "reset" })).toEqual(initialAuthState);
  });

  it("parcours courriel", () => {
    const state = run([{ type: "choose_email" }, { type: "signed_in", token: "m", isNewUser: false, via: "email" }]);
    expect(state).toMatchObject({ screen: "success", via: "email" });
  });
});

describe("délai de renvoi", () => {
  it("compte à rebours arrondi vers le haut, jamais négatif", () => {
    expect(secondsRemaining(null, 1000)).toBe(0);
    expect(secondsRemaining(31_000, 1_000)).toBe(30);
    expect(secondsRemaining(1_500, 1_000)).toBe(1);
    expect(secondsRemaining(1_000, 5_000)).toBe(0);
  });

  it("formate minutes et secondes", () => {
    expect(formatCountdown(27)).toBe("0:27");
    expect(formatCountdown(75)).toBe("1:15");
  });
});

describe("texte de succès", () => {
  it("distingue nouveau compte et retour", () => {
    expect(successCopy(true, "google").title).toContain("Bienvenue");
    expect(successCopy(false, "phone").title).toContain("revoir");
  });
});
