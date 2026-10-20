import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone, phoneErrorMessage } from "./phone";

describe("normalizePhone (mobile)", () => {
  it("accepte un numéro canadien formaté de plusieurs façons", () => {
    for (const input of ["514 555 1234", "(514) 555-1234", "1 514 555 1234", "5145551234"]) {
      expect(normalizePhone("+1", input)).toEqual({ ok: true, e164: "+15145551234" });
    }
  });

  it("refuse un numéro trop court, trop long ou à indicatif régional invalide", () => {
    expect(normalizePhone("+1", "514 555 123")).toEqual({ ok: false, error: "too_short" });
    expect(normalizePhone("+1", "514 555 12345")).toEqual({ ok: false, error: "too_long" });
    expect(normalizePhone("+1", "114 555 1234")).toEqual({ ok: false, error: "invalid_nanp" });
  });

  it("refuse les lettres", () => {
    expect(normalizePhone("+1", "514-555-12ab")).toEqual({ ok: false, error: "invalid_chars" });
  });

  it("retire le zéro initial hors Italie", () => {
    expect(normalizePhone("+33", "06 12 34 56 78")).toEqual({ ok: true, e164: "+33612345678" });
    expect(normalizePhone("+39", "0612345678")).toEqual({ ok: true, e164: "+390612345678" });
  });

  it("refuse un indicatif invalide", () => {
    expect(normalizePhone("abc", "5145551234")).toEqual({ ok: false, error: "invalid_dial" });
  });

  it("n'affiche que les quatre derniers chiffres", () => {
    expect(maskPhone("+15145551234")).toBe("+1 ••• ••• 1234");
    expect(maskPhone("+15145551234")).not.toContain("514");
  });

  it("donne un message pour chaque erreur", () => {
    for (const error of ["invalid_dial", "invalid_chars", "too_short", "too_long", "invalid_nanp"] as const) {
      expect(phoneErrorMessage(error).length).toBeGreaterThan(10);
    }
  });
});
