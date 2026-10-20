import { describe, expect, it } from "vitest";
import { isValidE164, maskPhone, normalizePhone } from "@/lib/phone";

describe("validation des numéros de téléphone", () => {
  it("accepte un numéro canadien dans plusieurs formats", () => {
    for (const input of ["514 555 1234", "(514) 555-1234", "514.555.1234", "5145551234", "1 514 555 1234"]) {
      expect(normalizePhone("+1", input)).toEqual({ ok: true, e164: "+15145551234" });
    }
  });

  it("refuse les numéros nord-américains trop courts, trop longs ou impossibles", () => {
    expect(normalizePhone("+1", "514 555 123")).toEqual({ ok: false, error: "too_short" });
    expect(normalizePhone("+1", "514 555 12345")).toEqual({ ok: false, error: "too_long" });
    expect(normalizePhone("+1", "114 555 1234")).toEqual({ ok: false, error: "invalid_nanp" });
    expect(normalizePhone("+1", "514 055 1234")).toEqual({ ok: false, error: "invalid_nanp" });
  });

  it("refuse les caractères inattendus et les indicatifs invalides", () => {
    expect(normalizePhone("+1", "514-555-12ab")).toEqual({ ok: false, error: "invalid_chars" });
    expect(normalizePhone("+1", "")).toEqual({ ok: false, error: "too_short" });
    expect(normalizePhone("+0", "5145551234")).toEqual({ ok: false, error: "invalid_dial" });
    expect(normalizePhone("abc", "5145551234")).toEqual({ ok: false, error: "invalid_dial" });
  });

  it("retire le zéro initial des numéros internationaux, sauf pour l'Italie", () => {
    expect(normalizePhone("+33", "06 12 34 56 78")).toEqual({ ok: true, e164: "+33612345678" });
    expect(normalizePhone("+39", "06 1234 5678")).toEqual({ ok: true, e164: "+390612345678" });
  });

  it("respecte la longueur maximale E.164", () => {
    expect(normalizePhone("+33", "1234567890123")).toEqual({ ok: true, e164: "+331234567890123" });
    expect(normalizePhone("+33", "12345678901234")).toEqual({ ok: false, error: "too_long" });
    expect(normalizePhone("+33", "123")).toEqual({ ok: false, error: "too_short" });
  });

  it("reconnaît strictement le format E.164 côté serveur", () => {
    expect(isValidE164("+15145551234")).toBe(true);
    expect(isValidE164("+33612345678")).toBe(true);
    expect(isValidE164("15145551234")).toBe(false);
    expect(isValidE164("+1514555123")).toBe(false);
    expect(isValidE164("+1 514 555 1234")).toBe(false);
    expect(isValidE164("+0123456789")).toBe(false);
    expect(isValidE164(5145551234)).toBe(false);
    expect(isValidE164(undefined)).toBe(false);
  });

  it("masque le numéro en gardant les quatre derniers chiffres", () => {
    expect(maskPhone("+15145551234")).toBe("+1 ••• ••• 1234");
    expect(maskPhone("+33612345678")).toBe("+••••••• 5678");
    expect(maskPhone("+12")).toBe("••••");
  });
});
