"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale, Slot } from "@/lib/constants";
import { formatCad, formatMinutes } from "@/lib/date";
import { formatQuantity, scaleQuantity } from "@/lib/quantity";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { Photo } from "@/components/Shell";

type Ingredient = { name: string; quantity: number | null; unit: string | null; scalable: boolean };
export type MealCard = {
  planId: string;
  slot: Slot;
  servings: number;
  reaction: "like" | "dislike" | null;
  favorite: boolean;
  explanation: string[];
  warnings: string[];
  recipe: {
    id: string;
    slug: string;
    name: string;
    prepMinutes: number;
    cookMinutes: number;
    restMinutes: number;
    baseServings: number;
    costPerServingCents: number | null;
    costNote: string;
    photoUrl: string | null;
    ingredients: Ingredient[];
    markers: string[];
  };
};

export function MealGrid({ meals, locale, empty }: { meals: MealCard[]; locale: Locale; empty?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(key: string, body: unknown) {
    setPending(key);
    setError(null);
    try {
      await send("/api/menus", "POST", body);
      router.refresh();
    } catch (caught) {
      setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
    } finally {
      setPending(null);
    }
  }

  if (empty || meals.length === 0) return <p className="notice info" role="status">{t(locale, "empty_meals")}</p>;

  return (
    <div>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      <div className="meal-grid">
        {meals.map((meal) => (
          <article className="card" key={meal.planId}>
            <Photo src={meal.recipe.photoUrl} />
            <div className="card-body">
              <p className="kicker">{t(locale, `slot_${meal.slot}`)}</p>
              <h3>{meal.recipe.name}</h3>
              <p className="meta">
                {t(locale, "prep")} {formatMinutes(meal.recipe.prepMinutes, locale)} · {t(locale, "cook")} {formatMinutes(meal.recipe.cookMinutes, locale)}
                {meal.recipe.restMinutes ? ` · ${t(locale, "rest")} ${formatMinutes(meal.recipe.restMinutes, locale)}` : ""} · {meal.servings} {t(locale, "servings").toLowerCase()}
              </p>
              <p className="meta">
                {meal.recipe.costPerServingCents == null ? t(locale, "nutrition_missing") : `${t(locale, "cost")} : ${formatCad(meal.recipe.costPerServingCents, locale)}`}
              </p>
              <p>{meal.recipe.ingredients.slice(0, 4).map((item) => item.name).join(", ")}</p>
              <ul>
                {meal.recipe.markers.slice(0, 3).map((marker) => <li key={marker}>{marker}</li>)}
              </ul>
              {meal.warnings.map((warning) => <p className="notice info" key={warning}>{warning}</p>)}
              <details>
                <summary>{t(locale, "why")}</summary>
                <ul>{meal.explanation.map((line) => <li key={line}>{line}</li>)}</ul>
              </details>
              <div className="actions">
                <Link className="btn btn-primary" href={`/recettes/${meal.recipe.slug}`}>{t(locale, "see_recipe")}</Link>
                <button className="btn btn-secondary" type="button" disabled={pending === meal.planId} onClick={() => run(meal.planId, { action: "replace", planId: meal.planId })}>
                  {t(locale, "replace")}
                </button>
                <button className="btn btn-secondary" type="button" aria-pressed={meal.reaction === "like"} onClick={() => run(`${meal.planId}-like`, { action: "reaction", planId: meal.planId, reaction: meal.reaction === "like" ? null : "like" })}>{t(locale, "like")}</button>
                <button className="btn btn-secondary" type="button" aria-pressed={meal.reaction === "dislike"} onClick={() => run(`${meal.planId}-dislike`, { action: "reaction", planId: meal.planId, reaction: meal.reaction === "dislike" ? null : "dislike" })}>{t(locale, "dislike")}</button>
                <button className="btn btn-secondary" type="button" aria-pressed={meal.favorite} onClick={() => run(`${meal.planId}-fav`, { action: "favorite", recipeId: meal.recipe.id, favorite: !meal.favorite })}>
                  {meal.favorite ? t(locale, "unfavorite") : t(locale, "favorite")}
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function MenuActions({ locale, scope }: { locale: Locale; scope: "today" | "week" }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-primary noprint"
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await send("/api/menus", "POST", { action: scope === "today" ? "regenerate-today" : "regenerate-week" });
        router.refresh();
        setPending(false);
      }}
    >
      {scope === "today" ? t(locale, "another_menu") : t(locale, "regenerate_week")}
    </button>
  );
}

export function ServingControl({ locale, planId, base, current, ingredients }: { locale: Locale; planId?: string; base: number; current: number; ingredients: Ingredient[] }) {
  const router = useRouter();
  const [servings, setServings] = useState(current);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <div>
      <label htmlFor="servings">{t(locale, "servings")}</label>
      <input id="servings" type="number" min={1} max={12} value={servings} onChange={(event) => setServings(Number(event.target.value))} />
      <ul>
        {ingredients.map((item) => {
          const quantity = scaleQuantity(item.quantity, base, servings, item.scalable);
          const unit = item.unit ? t(locale, `unit_${item.unit}`) : "";
          return <li key={item.name}>{item.name} {quantity == null ? "" : `· ${formatQuantity(quantity, locale)} ${unit}`}</li>;
        })}
      </ul>
      {planId ? (
        <button
          className="btn btn-secondary"
          type="button"
          onClick={async () => {
            await send("/api/menus", "POST", { action: "servings", planId, servings });
            setMessage(t(locale, "saved"));
            router.refresh();
          }}
        >
          {t(locale, "apply_servings")}
        </button>
      ) : null}
      <p className="meta">{t(locale, "portions_note")}</p>
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
