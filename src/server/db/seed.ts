import bcrypt from "bcryptjs";
import { catalog } from "@/server/recipes/catalog";
import { compactPostal, normalizeSearch } from "@/lib/text";
import { asNumber, exec, query, readJsonFile, type Db } from "@/server/db/client";
import { clearMunicipalityCache } from "@/server/geo/repository";
import type { Municipality } from "@/server/geo/search";
import { clearRecipeCache } from "@/server/recipes/repository";

function chunks<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let index = 0; index < items.length; index += size) output.push(items.slice(index, index + size));
  return output;
}

export async function seed(): Promise<void> {
  const municipalities = asNumber((await query<{ count: number }>("SELECT COUNT(*) AS count FROM municipalities"))[0]?.count);
  if (municipalities === 0) {
    const records = readJsonFile<Municipality[]>("municipalities.json");
    await exec("BEGIN");
    try {
      for (const group of chunks(records, 40)) {
        const values: string[] = [];
        const params: unknown[] = [];
        group.forEach((record, index) => {
          const base = index * 10;
          values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, $${base + 10})`);
          const postal = compactPostal(record.postal);
          params.push(record.code, record.name, normalizeSearch(record.name), record.designation, record.postal, postal, postal.slice(0, 3), record.region, record.regionCode, record.mrc);
        });
        await query(
          `INSERT INTO municipalities (code, name, name_normalized, designation, postal, postal_compact, fsa, region_name, region_code, mrc_name) VALUES ${values.join(", ")} ON CONFLICT (code) DO NOTHING`,
          params,
        );
      }
      await exec("COMMIT");
    } catch (error) {
      await exec("ROLLBACK");
      throw error;
    }
    clearMunicipalityCache();
  }

  const recipes = asNumber((await query<{ count: number }>("SELECT COUNT(*) AS count FROM recipes"))[0]?.count);
  if (recipes === 0) {
    const now = new Date().toISOString();
    for (const item of catalog) {
      await query(
        `INSERT INTO recipes (
          id, slug, name_fr, name_en, description_fr, description_en, prep_minutes, cook_minutes, rest_minutes,
          servings, cost_per_serving_cents, cost_estimated_at, cost_source, cost_note_fr, cost_note_en, difficulty,
          seasons, meal_slots, contains, allergens, cross_contamination, allergen_data_complete, region_name,
          region_documented, region_note_fr, region_note_en, photo_url, photo_credit, photo_license, steps_fr,
          steps_en, tags, status, source, created_at, updated_at
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,'published','curated',$33,$33
        )`,
        [
          item.id, item.slug, item.nameFr, item.nameEn, item.descriptionFr, item.descriptionEn, item.prepMinutes,
          item.cookMinutes, item.restMinutes, item.servings, item.costPerServingCents, item.costEstimatedAt,
          item.costSource, item.costNoteFr, item.costNoteEn, item.difficulty, JSON.stringify(item.seasons),
          JSON.stringify(item.mealSlots), JSON.stringify(item.contains), JSON.stringify(item.allergens),
          JSON.stringify(item.crossContamination), true, item.regionName, item.regionDocumented, item.regionNoteFr,
          item.regionNoteEn, item.photoUrl, item.photoCredit, item.photoLicense, JSON.stringify(item.stepsFr),
          JSON.stringify(item.stepsEn), JSON.stringify(item.tags), now,
        ],
      );
      for (const [index, ingredient] of item.ingredients.entries()) {
        await query(
          `INSERT INTO recipe_ingredients (
            id, recipe_id, name_fr, name_en, quantity, unit, category, allergens, sub_ingredients, scalable, sort_order
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
          [
            `${item.id}-i${index}`, item.id, ingredient.nameFr, ingredient.nameEn, ingredient.quantity, ingredient.unit,
            ingredient.category, "[]", JSON.stringify(ingredient.subIngredients), ingredient.quantity != null, index,
          ],
        );
      }
    }
    clearRecipeCache();
  }

  const sources = asNumber((await query<{ count: number }>("SELECT COUNT(*) AS count FROM data_sources"))[0]?.count);
  if (sources === 0) {
    const rows = [
      ["mamh-municipalites", "Répertoire des municipalités du Québec", "geographie", "https://www.donneesquebec.ca/recherche/dataset/repertoire-des-municipalites-du-quebec", "Québec", "2026-02-27", "MAMH, licence CC-BY 4.0. Code postal du siège municipal seulement. Importé dans Mijoté le 19 octobre 2026."],
      ["catalogue-mijote", "Catalogue de recettes Mijoté", "recettes", null, "Québec", "2026-10-19", "Recettes rédigées pour le catalogue. Les coûts sont des estimations internes, pas des prix d'épicerie."],
      ["saison-quebec", "Repères saisonniers du Québec", "saison", "https://guide-alimentaire.canada.ca/fr/", "Québec", "2026-10-19", "Repères culinaires généraux. Aucun flux de disponibilité en magasin ni de tendance de recherche n'est branché."],
    ];
    for (const row of rows) {
      await query(
        `INSERT INTO data_sources (id, name, kind, url, geographic_zone, updated_on, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        row,
      );
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword && adminPassword.length >= 10) {
    const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [adminEmail]);
    if (existing.length === 0) {
      const now = new Date().toISOString();
      const id = crypto.randomUUID();
      const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
      const hash = await bcrypt.hash(adminPassword, rounds);
      await query(
        `INSERT INTO users (id, email, password_hash, role, email_verified_at, created_at, updated_at) VALUES ($1,$2,$3,'admin',$4,$4,$4)`,
        [id, adminEmail, hash, now],
      );
      await query(
        `INSERT INTO profiles (user_id, first_name, locale, onboarding_completed, updated_at, diets) VALUES ($1,'Admin','fr',TRUE,$2,'["omnivore"]')`,
        [id, now],
      );
      await query(`INSERT INTO notification_preferences (user_id, updated_at) VALUES ($1,$2)`, [id, now]);
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const demoEmail = (process.env.DEMO_EMAIL || "demo@mijote.local").trim().toLowerCase();
    const demoPassword = process.env.DEMO_PASSWORD || "Mijote-Demo-2026!";
    if (demoPassword.length >= 10) {
      const existing = await query<{ id: string }>("SELECT id FROM users WHERE email = $1", [demoEmail]);
      if (existing.length === 0) {
        const now = new Date().toISOString();
        const id = crypto.randomUUID();
        const rounds = Number(process.env.BCRYPT_ROUNDS ?? 12);
        const hash = await bcrypt.hash(demoPassword, rounds);
        await query(
          `INSERT INTO users (id, email, password_hash, role, email_verified_at, created_at, updated_at) VALUES ($1,$2,$3,'user',$4,$4,$4)`,
          [id, demoEmail, hash, now],
        );
        await query(
          `INSERT INTO profiles (user_id, first_name, locale, onboarding_completed, country_code, country_chosen, updated_at, diets) VALUES ($1,'Démo','fr',TRUE,'CA',TRUE,$2,'["omnivore"]')`,
          [id, now],
        );
        await query(`INSERT INTO notification_preferences (user_id, updated_at) VALUES ($1,$2)`, [id, now]);
      }
    }
  }
}

export async function emptyDatabase(db: Db): Promise<void> {
  await db.exec(`
    DELETE FROM ai_outputs;
    DELETE FROM notifications;
    DELETE FROM notification_preferences;
    DELETE FROM grocery_items;
    DELETE FROM grocery_lists;
    DELETE FROM favorites;
    DELETE FROM meal_plans;
    DELETE FROM email_tokens;
    DELETE FROM sessions;
    DELETE FROM user_allergens;
    DELETE FROM profiles;
    DELETE FROM users;
  `);
}
