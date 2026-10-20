import { z } from "zod";
import {
  ALLERGENS,
  BREAKFAST_PREFS,
  DIETS,
  DINNER_PREFS,
  GOALS,
  LUNCH_PREFS,
  type Allergen,
  type Diet,
  type Locale,
} from "@/lib/constants";
import { compactPostal, isPostalQuery } from "@/lib/text";
import { asBoolean, asNumber, one, parseJson, query } from "@/server/db/client";
import { countryByCode } from "@/lib/countries";
import { municipalityByCode } from "@/server/geo/repository";

export const profileSchema = z.object({
  firstName: z.string().trim().max(80).optional().default(""),
  municipalityCode: z.string().trim().max(12).optional().default(""),
  postalCode: z.string().trim().max(10).optional().default(""),
  householdSize: z.number().int().min(1).max(12),
  locale: z.enum(["fr", "en"]),
  weeklyBudgetCents: z.number().int().min(0).max(500000),
  cookingTimeMinutes: z.number().int().min(10).max(180),
  diets: z.array(z.enum(DIETS)).max(6).default([]),
  customDietNotes: z.string().trim().max(500).optional().default(""),
  allergens: z.array(z.enum(ALLERGENS)).max(ALLERGENS.length).default([]),
  otherExclusions: z.array(z.string().trim().min(3).max(60)).max(30).default([]),
  breakfastPrefs: z.array(z.enum(BREAKFAST_PREFS)).max(6).default([]),
  lunchPrefs: z.array(z.enum(LUNCH_PREFS)).max(6).default([]),
  dinnerPrefs: z.array(z.enum(DINNER_PREFS)).max(7).default([]),
  goals: z.array(z.enum(GOALS)).max(6).default([]),
  onboardingCompleted: z.boolean().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export type ProfileRecord = {
  userId: string;
  firstName: string | null;
  municipalityCode: string | null;
  municipalityName: string | null;
  regionName: string | null;
  postalCode: string | null;
  householdSize: number;
  locale: Locale;
  weeklyBudgetCents: number;
  cookingTimeMinutes: number;
  diets: Diet[];
  customDietNotes: string | null;
  breakfastPrefs: string[];
  lunchPrefs: string[];
  dinnerPrefs: string[];
  goals: string[];
  otherExclusions: string[];
  allergens: Allergen[];
  onboardingCompleted: boolean;
  countryCode: string;
  countryChosen: boolean;
};

export async function getProfile(userId: string): Promise<ProfileRecord | null> {
  const row = await one<Record<string, unknown>>("SELECT * FROM profiles WHERE user_id = $1", [userId]);
  if (!row) return null;
  const allergens = await query<{ code: string }>("SELECT code FROM user_allergens WHERE user_id = $1", [userId]);
  return {
    userId,
    firstName: row.first_name ? String(row.first_name) : null,
    municipalityCode: row.municipality_code ? String(row.municipality_code) : null,
    municipalityName: row.municipality_name ? String(row.municipality_name) : null,
    regionName: row.region_name ? String(row.region_name) : null,
    postalCode: row.postal_code ? String(row.postal_code) : null,
    householdSize: asNumber(row.household_size, 2),
    locale: row.locale === "en" ? "en" : "fr",
    weeklyBudgetCents: asNumber(row.weekly_budget_cents, 18000),
    cookingTimeMinutes: asNumber(row.cooking_time_minutes, 45),
    diets: parseJson<Diet[]>(row.diets, ["omnivore"]),
    customDietNotes: row.custom_diet_notes ? String(row.custom_diet_notes) : null,
    breakfastPrefs: parseJson<string[]>(row.breakfast_prefs, []),
    lunchPrefs: parseJson<string[]>(row.lunch_prefs, []),
    dinnerPrefs: parseJson<string[]>(row.dinner_prefs, []),
    goals: parseJson<string[]>(row.goals, []),
    otherExclusions: parseJson<string[]>(row.other_exclusions, []),
    allergens: allergens.map((item) => item.code as Allergen),
    onboardingCompleted: asBoolean(row.onboarding_completed),
    countryCode: row.country_code ? String(row.country_code) : "CA",
    countryChosen: asBoolean(row.country_chosen),
  };
}

export async function saveProfile(userId: string, input: ProfileInput): Promise<{ ok: true } | { ok: false; error: string }> {
  let municipalityName: string | null = null;
  let regionName: string | null = null;
  if (input.municipalityCode) {
    const city = await municipalityByCode(input.municipalityCode);
    if (!city) return { ok: false, error: "invalid_city" };
    municipalityName = city.name;
    regionName = city.region;
  }
  let postal: string | null = null;
  if (input.postalCode) {
    if (!isPostalQuery(input.postalCode) || compactPostal(input.postalCode).length !== 6) return { ok: false, error: "invalid_postal" };
    postal = `${compactPostal(input.postalCode).slice(0, 3)} ${compactPostal(input.postalCode).slice(3)}`;
  }
  const diets = input.diets.length ? input.diets : (["omnivore"] as Diet[]);
  const now = new Date().toISOString();
  await query(
    `UPDATE profiles SET
      first_name = $2, municipality_code = $3, municipality_name = $4, region_name = $5, postal_code = $6,
      household_size = $7, locale = $8, weekly_budget_cents = $9, cooking_time_minutes = $10, diets = $11,
      custom_diet_notes = $12, breakfast_prefs = $13, lunch_prefs = $14, dinner_prefs = $15, goals = $16,
      other_exclusions = $17, onboarding_completed = $18, updated_at = $19
     WHERE user_id = $1`,
    [
      userId,
      input.firstName || null,
      input.municipalityCode || null,
      municipalityName,
      regionName,
      postal,
      input.householdSize,
      input.locale,
      input.weeklyBudgetCents,
      input.cookingTimeMinutes,
      JSON.stringify(diets),
      input.customDietNotes || null,
      JSON.stringify(input.breakfastPrefs),
      JSON.stringify(input.lunchPrefs),
      JSON.stringify(input.dinnerPrefs),
      JSON.stringify(input.goals),
      JSON.stringify(input.otherExclusions),
      input.onboardingCompleted ?? true,
      now,
    ],
  );
  await query("DELETE FROM user_allergens WHERE user_id = $1", [userId]);
  for (const code of input.allergens) {
    await query("INSERT INTO user_allergens (user_id, code) VALUES ($1,$2)", [userId, code]);
  }
  return { ok: true };
}

export async function setRegistrationCountry(userId: string, code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!countryByCode(code)) return { ok: false, error: "invalid" };
  await query(
    "UPDATE profiles SET country_code = $2, country_chosen = TRUE, onboarding_completed = TRUE, updated_at = $3 WHERE user_id = $1",
    [userId, code, new Date().toISOString()],
  );
  return { ok: true };
}
