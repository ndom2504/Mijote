import { describe, expect, it } from "vitest";
import { normalizePhone } from "../auth/phone";
import { DEFAULT_DIAL_COUNTRY, DIAL_COUNTRIES, defaultDialCountry, dialCountryByCode } from "./dialCodes";

describe("indicatifs téléphoniques", () => {
  it("place le Canada en premier et par défaut", () => {
    expect(DIAL_COUNTRIES[0]).toMatchObject({ code: "CA", dial: "+1" });
    expect(DEFAULT_DIAL_COUNTRY).toBe("CA");
    expect(dialCountryByCode("inconnu").code).toBe("CA");
  });

  it("n'a aucun code de pays en double", () => {
    const codes = DIAL_COUNTRIES.map((country) => country.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("n'a que des indicatifs acceptés par la validation", () => {
    for (const country of DIAL_COUNTRIES) {
      expect(country.dial).toMatch(/^\+[1-9]\d{0,2}$/);
      expect(normalizePhone(country.dial, "").ok).toBe(false);
    }
  });

  it("propose le pays d'inscription quand il a un indicatif, sinon le Canada", () => {
    expect(defaultDialCountry("FR")).toBe("FR");
    expect(defaultDialCountry("ZZ")).toBe("CA");
    expect(defaultDialCountry(null)).toBe("CA");
  });
});
