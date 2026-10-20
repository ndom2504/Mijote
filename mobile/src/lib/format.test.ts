import { describe, expect, it } from "vitest";
import {
  difficultyLabel,
  flagEmoji,
  greetingForHour,
  localStamp,
  normalizeSearch,
  portionsLabel,
  quantityLabel,
  totalMinutes,
} from "./format";

describe("formats de l'accueil", () => {
  it("salue selon l'heure locale", () => {
    expect(greetingForHour(7)).toBe("Bonjour !");
    expect(greetingForHour(17)).toBe("Bonjour !");
    expect(greetingForHour(18)).toBe("Bonsoir !");
    expect(greetingForHour(3)).toBe("Bonsoir !");
  });

  it("additionne préparation et cuisson", () => {
    expect(totalMinutes({ prepMinutes: 10, cookMinutes: 10 })).toBe(20);
  });

  it("accorde les portions et la difficulté", () => {
    expect(portionsLabel(1)).toBe("1 portion");
    expect(portionsLabel(2)).toBe("2 portions");
    expect(difficultyLabel("facile")).toBe("Facile");
    expect(difficultyLabel("moyen")).toBe("Moyen");
  });

  it("formate les quantités avec la virgule", () => {
    expect(quantityLabel(0.5, "tasse")).toBe("0,5 tasse");
    expect(quantityLabel(2, null)).toBe("2");
    expect(quantityLabel(null, "g")).toBe("");
    expect(quantityLabel(3, "unite")).toBe("3 unités");
    expect(quantityLabel(1, "unite")).toBe("1 unité");
  });

  it("lit la date et l'heure locales de l'appareil", () => {
    expect(localStamp(new Date(2026, 9, 20, 14, 5))).toEqual({ date: "2026-10-20", hour: 14 });
  });

  it("construit un drapeau et normalise la recherche", () => {
    expect(flagEmoji("CA")).toBe("🇨🇦");
    expect(flagEmoji("")).toBe("");
    expect(normalizeSearch("  Côte d'Ivoire ")).toBe("cote d'ivoire");
  });
});
