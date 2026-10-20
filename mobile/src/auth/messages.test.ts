import { describe, expect, it } from "vitest";
import { authErrorMessage, formatWait, googleUnavailableMessage } from "./messages";

describe("messages d'authentification", () => {
  it("formate les attentes", () => {
    expect(formatWait(undefined)).toBe("quelques minutes");
    expect(formatWait(20)).toBe("20 secondes");
    expect(formatWait(61)).toBe("2 minutes");
    expect(formatWait(60)).toBe("1 minute");
    expect(formatWait(3600)).toBe("1 heure");
  });

  it("indique l'attente imposée par le serveur", () => {
    expect(authErrorMessage("rate_limited", 300)).toContain("5 minutes");
  });

  it("distingue code invalide et code expiré", () => {
    expect(authErrorMessage("invalid_code")).not.toBe(authErrorMessage("expired"));
    expect(authErrorMessage("expired")).toContain("expiré");
  });

  it("ne dit jamais si un numéro ou un compte existe déjà", () => {
    for (const code of ["invalid_phone", "invalid_code", "expired", "rate_limited", "invalid_login", "unknown_code"]) {
      expect(authErrorMessage(code)).not.toMatch(/existe|inscrit|déjà un compte avec ce numéro/i);
    }
  });

  it("traite l'inconnu par un message neutre", () => {
    expect(authErrorMessage("quelque_chose")).toContain("n'a pas abouti");
  });

  it("explique pourquoi Google n'est pas disponible", () => {
    expect(googleUnavailableMessage("expo_go")).toContain("Expo Go");
    expect(googleUnavailableMessage("not_configured")).toContain("configuré");
    expect(googleUnavailableMessage("web")).toContain("Android");
  });
});
