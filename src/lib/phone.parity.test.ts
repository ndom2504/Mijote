import { describe, expect, it } from "vitest";
import { maskPhone as mobileMask, normalizePhone as mobileNormalize } from "../../mobile/src/auth/phone";
import { maskPhone, normalizePhone } from "./phone";

const DIALS = ["+1", "1", "+33", "+39", "+44", "+509", "+999", "abc", "", "+0"];
const NUMBERS = [
  "",
  "514 555 1234",
  "(514) 555-1234",
  "1 514 555 1234",
  "5145551234",
  "114 555 1234",
  "514 155 1234",
  "514555123",
  "51455512345",
  "06 12 34 56 78",
  "0612345678",
  "612",
  "0123456789",
  "12345678901234",
  "1234567890123456",
  "514-555-12ab",
  "+33 6 12 34 56 78",
];

describe("copie mobile de la validation téléphonique", () => {
  it("donne les mêmes résultats que le serveur pour chaque combinaison", () => {
    for (const dial of DIALS) {
      for (const national of NUMBERS) {
        expect(mobileNormalize(dial, national), `${dial} / ${national}`).toEqual(normalizePhone(dial, national));
      }
    }
  });

  it("masque les numéros de la même façon", () => {
    for (const value of ["+15145551234", "+33612345678", "+4412", "+5091234567"]) {
      expect(mobileMask(value)).toBe(maskPhone(value));
    }
  });
});
