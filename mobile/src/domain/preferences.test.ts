import { describe, expect, it } from "vitest";
import {
  addExclusion,
  dashboardStats,
  EMPTY_PROFILE,
  greetingFor,
  isDirty,
  preferenceChips,
  profilePayload,
  removedAllergens,
  toggleDiet,
} from "./preferences";
import type { Profile } from "./types";

const profile = (patch: Partial<Profile> = {}): Profile => ({ ...EMPTY_PROFILE, ...patch });

describe("régime alimentaire", () => {
  it("garde un seul régime de base à la fois", () => {
    expect(toggleDiet(["omnivore"], "vegan")).toEqual(["vegan"]);
    expect(toggleDiet(["vegetarian"], "pescatarian")).toEqual(["pescatarian"]);
  });

  it("ajoute « sans porc » et « sans bœuf » au régime de base", () => {
    expect(toggleDiet(["vegetarian"], "no_pork")).toEqual(["vegetarian", "no_pork"]);
    expect(toggleDiet(["omnivore", "no_pork"], "no_beef")).toEqual(["omnivore", "no_pork", "no_beef"]);
  });

  it("revient à omnivore quand on décoche le régime de base", () => {
    expect(toggleDiet(["vegan"], "vegan")).toEqual(["omnivore"]);
    expect(toggleDiet(["vegetarian", "no_pork"], "vegetarian")).toEqual(["omnivore", "no_pork"]);
    expect(toggleDiet(["omnivore"], "omnivore")).toEqual(["omnivore"]);
  });
});

describe("ingrédients à éviter", () => {
  it("valide la longueur, les doublons (sans accent ni casse) et la limite", () => {
    expect(addExclusion([], "ab")).toEqual({ ok: false, error: "too_short" });
    expect(addExclusion([], "x".repeat(61))).toEqual({ ok: false, error: "too_long" });
    expect(addExclusion(["Coriandre"], " coriandre ")).toEqual({ ok: false, error: "duplicate" });
    expect(addExclusion(["Épinards"], "epinards")).toEqual({ ok: false, error: "duplicate" });
    expect(addExclusion(Array.from({ length: 30 }, (_, i) => `ingrédient ${i}`), "nouveau")).toEqual({ ok: false, error: "limit" });
    expect(addExclusion(["Ail"], "  Olives   noires ")).toEqual({ ok: true, list: ["Ail", "Olives noires"] });
  });
});

describe("modifications", () => {
  it("détecte une modification, sans tenir compte de l'ordre", () => {
    const base = profile({ allergens: ["milk", "eggs"], diets: ["omnivore"] });
    expect(isDirty(base, profile({ allergens: ["eggs", "milk"] }))).toBe(false);
    expect(isDirty(base, profile({ allergens: ["milk"] }))).toBe(true);
    expect(isDirty(base, profile({ allergens: ["milk", "eggs"], householdSize: 5 }))).toBe(true);
    expect(isDirty(base, profile({ allergens: ["milk", "eggs"], firstName: "  " }))).toBe(false);
  });

  it("repère les allergies retirées", () => {
    expect(removedAllergens(profile({ allergens: ["milk", "soy"] }), profile({ allergens: ["soy"] }))).toEqual(["milk"]);
    expect(removedAllergens(profile({ allergens: ["soy"] }), profile({ allergens: ["soy", "fish"] }))).toEqual([]);
  });

  it("prépare un envoi complet et borné pour le serveur", () => {
    const payload = profilePayload(profile({ firstName: " Marie ", householdSize: 40, cookingTimeMinutes: 5, diets: [] }));
    expect(payload.firstName).toBe("Marie");
    expect(payload.householdSize).toBe(12);
    expect(payload.cookingTimeMinutes).toBe(10);
    expect(payload.diets).toEqual(["omnivore"]);
    expect(payload.onboardingCompleted).toBe(true);
    expect(payload).toHaveProperty("weeklyBudgetCents");
    expect(payload).toHaveProperty("postalCode");
  });
});

describe("pastilles du tableau de bord", () => {
  it("met les allergies en premier, avec leur propre type", () => {
    const { chips } = preferenceChips(profile({ allergens: ["peanuts"], diets: ["vegetarian"], otherExclusions: ["coriandre"], goals: ["decouverte"] }));
    expect(chips[0]).toMatchObject({ kind: "allergy", label: "Allergie : Arachides" });
    expect(chips.map((chip) => chip.kind)).toContain("diet");
    expect(chips.find((chip) => chip.kind === "avoid")?.label).toBe("Sans coriandre");
  });

  it("ne relègue jamais une allergie dans « +N »", () => {
    const allergens = ["peanuts", "tree_nuts", "milk", "eggs", "soy", "fish", "sesame"];
    const { chips, extra } = preferenceChips(profile({ allergens, goals: ["budget"] }), 4);
    expect(chips.filter((chip) => chip.kind === "allergy")).toHaveLength(7);
    expect(chips.every((chip) => chip.kind === "allergy")).toBe(true);
    expect(extra).toBeGreaterThan(0);
  });

  it("résume le surplus et affiche le temps et les portions", () => {
    const { chips, extra } = preferenceChips(profile({ cookingTimeMinutes: 30, householdSize: 1, goals: ["budget", "temps", "decouverte"] }), 3);
    expect(chips).toHaveLength(3);
    expect(extra).toBeGreaterThan(0);
    const all = preferenceChips(profile({ cookingTimeMinutes: 30, householdSize: 1 }), 10).chips.map((chip) => chip.label);
    expect(all).toContain("30 min ou moins");
    expect(all).toContain("1 portion");
  });
});

describe("salutation et statistiques", () => {
  it("salue selon l'heure locale, avec le prénom", () => {
    expect(greetingFor(9, "Marie")).toBe("Bonjour Marie !");
    expect(greetingFor(17, " Marie ")).toBe("Bonjour Marie !");
    expect(greetingFor(18, "Marie")).toBe("Bonsoir Marie !");
    expect(greetingFor(3, "")).toBe("Bonsoir !");
    expect(greetingFor(5, "")).toBe("Bonjour !");
  });

  it("n'invente aucun chiffre tant que les données ne sont pas chargées", () => {
    const stats = dashboardStats({
      saved: { status: "loading", items: [] },
      favorites: { status: "ready", items: [1, 2, 3] },
      lists: { status: "error", items: [] },
    });
    expect(stats).toEqual({ saved: null, favorites: 3, lists: null });
    expect(dashboardStats({ saved: { status: "ready", items: [] }, favorites: { status: "ready", items: [] }, lists: { status: "ready", items: [] } })).toEqual({
      saved: 0,
      favorites: 0,
      lists: 0,
    });
  });
});
