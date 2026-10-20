import { describe, expect, it, vi } from "vitest";
import { googleErrorMessage, signInWithGoogle, type GoogleDeps } from "./googleSignIn";

const CODES = { SIGN_IN_CANCELLED: "-5", IN_PROGRESS: "-3", PLAY_SERVICES_NOT_AVAILABLE: "-4" };

function deps(overrides: Partial<{ signIn: () => Promise<unknown>; hasPlayServices: () => Promise<boolean> }> = {}, extra: Partial<GoogleDeps> = {}) {
  const GoogleSignin = {
    configure: vi.fn(),
    hasPlayServices: overrides.hasPlayServices ?? vi.fn().mockResolvedValue(true),
    signIn: overrides.signIn ?? vi.fn().mockResolvedValue({ type: "success", data: { idToken: "ID.TOKEN" } }),
    signOut: vi.fn().mockResolvedValue(undefined),
  };
  const result: GoogleDeps = {
    platform: "android",
    webClientId: "web-client",
    iosClientId: undefined,
    load: () => ({ GoogleSignin, statusCodes: CODES }) as never,
    ...extra,
  };
  return { result, GoogleSignin };
}

describe("signInWithGoogle", () => {
  it("renvoie le jeton d'identité et oublie la session Google locale", async () => {
    const { result, GoogleSignin } = deps();
    await expect(signInWithGoogle(result)).resolves.toEqual({ status: "success", idToken: "ID.TOKEN" });
    expect(GoogleSignin.configure).toHaveBeenCalledWith({ webClientId: "web-client", iosClientId: undefined });
    expect(GoogleSignin.signOut).toHaveBeenCalled();
  });

  it("est indisponible sur le web", async () => {
    expect(await signInWithGoogle(deps({}, { platform: "web" }).result)).toEqual({ status: "unavailable", reason: "web" });
  });

  it("est indisponible sans identifiant client configuré", async () => {
    expect(await signInWithGoogle(deps({}, { webClientId: undefined }).result)).toEqual({
      status: "unavailable",
      reason: "not_configured",
    });
  });

  it("est indisponible quand le module natif est absent (Expo Go)", async () => {
    expect(await signInWithGoogle(deps({}, { load: () => null }).result)).toEqual({ status: "unavailable", reason: "expo_go" });
  });

  it("traite la fermeture de la fenêtre Google comme une annulation", async () => {
    const byType = deps({ signIn: vi.fn().mockResolvedValue({ type: "cancelled", data: null }) });
    expect(await signInWithGoogle(byType.result)).toEqual({ status: "cancelled" });
    const byCode = deps({ signIn: vi.fn().mockRejectedValue({ code: "-5", message: "cancelled" }) });
    expect(await signInWithGoogle(byCode.result)).toEqual({ status: "cancelled" });
  });

  it("signale une erreur réseau", async () => {
    const byCode = deps({ signIn: vi.fn().mockRejectedValue({ code: "7", message: "x" }) });
    expect(await signInWithGoogle(byCode.result)).toEqual({ status: "error", reason: "network" });
    const byMessage = deps({ signIn: vi.fn().mockRejectedValue(new Error("A network error occurred")) });
    expect(await signInWithGoogle(byMessage.result)).toEqual({ status: "error", reason: "network" });
  });

  it("signale l'absence de services Google Play", async () => {
    const missing = deps({ hasPlayServices: vi.fn().mockRejectedValue({ code: "-4", message: "no play" }) });
    expect(await signInWithGoogle(missing.result)).toEqual({ status: "error", reason: "play_services" });
  });

  it("refuse une réponse sans jeton", async () => {
    const empty = deps({ signIn: vi.fn().mockResolvedValue({ type: "success", data: { idToken: null } }) });
    expect(await signInWithGoogle(empty.result)).toEqual({ status: "error", reason: "unknown" });
  });

  it("ne vérifie pas Google Play sur iOS", async () => {
    const ios = deps({}, { platform: "ios" });
    await signInWithGoogle(ios.result);
    expect(ios.GoogleSignin.hasPlayServices).not.toHaveBeenCalled();
  });

  it("a un message pour chaque erreur", () => {
    for (const reason of ["play_services", "network", "unknown"] as const) {
      expect(googleErrorMessage(reason).length).toBeGreaterThan(10);
    }
  });
});
