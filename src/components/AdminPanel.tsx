"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ALLERGENS, GROCERY_CATEGORIES, SLOTS, type Locale } from "@/lib/constants";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

export function ReviewButton({ locale, id }: { locale: Locale; id: string }) {
  const router = useRouter();
  return (
    <button className="btn btn-secondary" type="button" onClick={async () => { await send("/api/admin", "POST", { action: "review", id }); router.refresh(); }}>
      {t(locale, "review")}
    </button>
  );
}

export function AdminRecipeForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <form
      className="panel"
      onSubmit={async (event) => {
        event.preventDefault();
        setError(null);
        const form = new FormData(event.currentTarget);
        const slots = SLOTS.filter((slot) => form.get(`slot-${slot}`) === "on");
        const extras = ALLERGENS.filter((code) => form.get(`allergen-${code}`) === "on");
        try {
          await send("/api/admin", "POST", {
            nameFr: form.get("nameFr"),
            nameEn: form.get("nameEn") || "",
            descriptionFr: form.get("descriptionFr"),
            descriptionEn: form.get("descriptionEn") || "",
            prepMinutes: Number(form.get("prep")),
            cookMinutes: Number(form.get("cook")),
            servings: Number(form.get("servings")),
            costPerServingCents: form.get("cost") ? Math.round(Number(form.get("cost")) * 100) : null,
            difficulty: form.get("difficulty"),
            seasons: ["printemps", "ete", "automne", "hiver"],
            mealSlots: slots,
            tags: [],
            status: form.get("status"),
            allergenDataComplete: form.get("complete") === "on",
            extraAllergens: extras,
            crossContamination: [],
            stepsFr: String(form.get("steps")).split("\n").map((line) => line.trim()).filter(Boolean),
            stepsEn: [],
            ingredients: String(form.get("ingredients")).split("\n").map((line) => line.trim()).filter(Boolean).map((nameFr) => ({
              nameFr,
              nameEn: "",
              quantity: null,
              unit: null,
              category: String(form.get("category")),
            })),
          });
          setSaved(true);
          router.refresh();
        } catch (caught) {
          setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
        }
      }}
    >
      <h2>{t(locale, "add_recipe")}</h2>
      <p className="meta">{t(locale, "allergens_kept")}</p>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {saved ? <p className="notice info" role="status">{t(locale, "saved")}</p> : null}
      <label htmlFor="nameFr">Nom</label>
      <input id="nameFr" name="nameFr" required minLength={3} />
      <label htmlFor="nameEn">English name</label>
      <input id="nameEn" name="nameEn" />
      <label htmlFor="descriptionFr">Description</label>
      <textarea id="descriptionFr" name="descriptionFr" required minLength={10} />
      <label htmlFor="descriptionEn">English description</label>
      <textarea id="descriptionEn" name="descriptionEn" />
      <div className="field-row">
        <div><label htmlFor="prep">{t(locale, "prep")}</label><input id="prep" name="prep" type="number" min={0} defaultValue={15} required /></div>
        <div><label htmlFor="cook">{t(locale, "cook")}</label><input id="cook" name="cook" type="number" min={0} defaultValue={20} required /></div>
      </div>
      <label htmlFor="servings">{t(locale, "servings")}</label>
      <input id="servings" name="servings" type="number" min={1} max={12} defaultValue={4} required />
      <label htmlFor="cost">{t(locale, "cost")}</label>
      <input id="cost" name="cost" type="number" min={0} step="0.05" />
      <label htmlFor="difficulty">{t(locale, "status")}</label>
      <select id="difficulty" name="difficulty" defaultValue="facile">
        <option value="facile">{t(locale, "difficulty_facile")}</option>
        <option value="moyen">{t(locale, "difficulty_moyen")}</option>
      </select>
      <label htmlFor="status">{t(locale, "status")}</label>
      <select id="status" name="status" defaultValue="draft">
        <option value="draft">draft</option>
        <option value="published">published</option>
      </select>
      <fieldset>
        <legend>{t(locale, "catalog")}</legend>
        {SLOTS.map((slot) => (
          <label key={slot} className="chip"><input type="checkbox" name={`slot-${slot}`} /> {t(locale, `slot_${slot}`)}</label>
        ))}
      </fieldset>
      <label htmlFor="ingredients">{t(locale, "ingredients")}</label>
      <textarea id="ingredients" name="ingredients" required placeholder="carottes&#10;lentilles" />
      <label htmlFor="category">{t(locale, "cat_autres")}</label>
      <select id="category" name="category" defaultValue="autres">
        {GROCERY_CATEGORIES.map((category) => <option key={category} value={category}>{t(locale, `cat_${category}`)}</option>)}
      </select>
      <fieldset>
        <legend>{t(locale, "safety_title")}</legend>
        {ALLERGENS.map((code) => (
          <label key={code} className="chip"><input type="checkbox" name={`allergen-${code}`} /> {t(locale, `allergen_${code}`)}</label>
        ))}
        <label className="chip"><input type="checkbox" name="complete" /> {t(locale, "complete_data")}</label>
      </fieldset>
      <label htmlFor="steps">{t(locale, "steps")}</label>
      <textarea id="steps" name="steps" required />
      <button className="btn btn-primary" type="submit">{t(locale, "save")}</button>
    </form>
  );
}
