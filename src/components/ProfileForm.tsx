"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ALLERGENS,
  BREAKFAST_PREFS,
  DIETS,
  DINNER_PREFS,
  GOALS,
  LUNCH_PREFS,
  type Locale,
} from "@/lib/constants";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { CityField } from "@/components/CityField";

export type ProfileDraft = {
  firstName: string;
  municipalityCode: string;
  municipalityName: string;
  postalCode: string;
  householdSize: number;
  locale: Locale;
  weeklyBudgetCents: number;
  cookingTimeMinutes: number;
  diets: string[];
  customDietNotes: string;
  allergens: string[];
  otherExclusions: string;
  breakfastPrefs: string[];
  lunchPrefs: string[];
  dinnerPrefs: string[];
  goals: string[];
};

export function ProfileForm({ locale, initial, mode }: { locale: Locale; initial: ProfileDraft; mode: "wizard" | "edit" }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [noBudget, setNoBudget] = useState(initial.weeklyBudgetCents === 0);
  const steps = mode === "wizard" ? 5 : 1;

  function toggle(list: string[], value: string) {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  }

  async function save() {
    setPending(true);
    setError(null);
    try {
      await send("/api/profile", "PUT", {
        ...draft,
        weeklyBudgetCents: noBudget ? 0 : draft.weeklyBudgetCents,
        otherExclusions: draft.otherExclusions.split(",").map((item) => item.trim()).filter((item) => item.length >= 3),
        onboardingCompleted: true,
      });
      router.push("/aujourd-hui");
      router.refresh();
    } catch (caught) {
      setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
      setPending(false);
    }
  }

  const show = (index: number) => mode === "edit" || step === index;

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (mode === "wizard" && step < 4) setStep(step + 1);
        else void save();
      }}
    >
      {mode === "wizard" ? (
        <div>
          <p className="kicker">{t(locale, "step")} {step + 1} {t(locale, "of")} 5</p>
          <div className="progress" aria-hidden="true"><span style={{ width: `${((step + 1) / steps) * 100}%` }} /></div>
        </div>
      ) : null}
      {error ? <p className="notice error" role="alert">{error}</p> : null}

      {show(0) ? (
        <section>
          <label htmlFor="firstName">{t(locale, "first_name")}</label>
          <input id="firstName" value={draft.firstName} onChange={(event) => setDraft({ ...draft, firstName: event.target.value })} autoComplete="given-name" />
          <CityField
            locale={locale}
            selected={draft.municipalityCode ? { code: draft.municipalityCode, name: draft.municipalityName } : null}
            onSelect={(city) => setDraft({ ...draft, municipalityCode: city?.code ?? "", municipalityName: city?.name ?? "" })}
          />
          <label htmlFor="postal">{t(locale, "postal")}</label>
          <input id="postal" value={draft.postalCode} onChange={(event) => setDraft({ ...draft, postalCode: event.target.value })} autoComplete="postal-code" />
          <div className="field-row">
            <div>
              <label htmlFor="household">{t(locale, "household")}</label>
              <input id="household" type="number" min={1} max={12} value={draft.householdSize} onChange={(event) => setDraft({ ...draft, householdSize: Number(event.target.value) })} />
            </div>
            <div>
              <label htmlFor="locale">{t(locale, "language")}</label>
              <select id="locale" value={draft.locale} onChange={(event) => setDraft({ ...draft, locale: event.target.value as Locale })}>
                <option value="fr">Français</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
          <label htmlFor="budget">{t(locale, "budget")}</label>
          <input id="budget" type="number" min={0} step={5} disabled={noBudget} value={Math.round(draft.weeklyBudgetCents / 100)} onChange={(event) => setDraft({ ...draft, weeklyBudgetCents: Math.round(Number(event.target.value) * 100) })} />
          <label className="chip"><input type="checkbox" checked={noBudget} onChange={(event) => setNoBudget(event.target.checked)} /> {t(locale, "no_budget")}</label>
          <label htmlFor="time">{t(locale, "time")}</label>
          <input id="time" type="number" min={10} max={180} value={draft.cookingTimeMinutes} onChange={(event) => setDraft({ ...draft, cookingTimeMinutes: Number(event.target.value) })} />
        </section>
      ) : null}

      {show(1) ? (
        <section>
          <h2>{t(locale, "preferences")}</h2>
          <p className="meta">{t(locale, "diets_help")}</p>
          <div className="checks">
            {DIETS.map((code) => (
              <label key={code} className="chip">
                <input type="checkbox" checked={draft.diets.includes(code)} onChange={() => setDraft({ ...draft, diets: toggle(draft.diets, code) })} />
                {t(locale, `diet_${code}`)}
              </label>
            ))}
          </div>
          <label htmlFor="customDiet">{t(locale, "custom_diet")}</label>
          <textarea id="customDiet" value={draft.customDietNotes} onChange={(event) => setDraft({ ...draft, customDietNotes: event.target.value })} />
        </section>
      ) : null}

      {show(2) ? (
        <section>
          <h2>{t(locale, "safety_title")}</h2>
          <p className="meta">{t(locale, "allergy_help")}</p>
          <div className="checks">
            {ALLERGENS.map((code) => (
              <label key={code} className="chip">
                <input type="checkbox" checked={draft.allergens.includes(code)} onChange={() => setDraft({ ...draft, allergens: toggle(draft.allergens, code) })} />
                {t(locale, `allergen_${code}`)}
              </label>
            ))}
          </div>
          <label htmlFor="exclusions">{t(locale, "exclusions")}</label>
          <input id="exclusions" value={draft.otherExclusions} onChange={(event) => setDraft({ ...draft, otherExclusions: event.target.value })} />
          <p className="meta">{t(locale, "exclusions_help")}</p>
        </section>
      ) : null}

      {show(3) ? (
        <section>
          {([
            ["slot_breakfast", "breakfastPrefs", BREAKFAST_PREFS],
            ["slot_lunch", "lunchPrefs", LUNCH_PREFS],
            ["slot_dinner", "dinnerPrefs", DINNER_PREFS],
          ] as const).map(([title, key, options]) => (
            <div key={key}>
              <h3>{t(locale, title)}</h3>
              <div className="checks">
                {options.map((code) => (
                  <label key={code} className="chip">
                    <input
                      type="checkbox"
                      checked={draft[key].includes(code)}
                      onChange={() => setDraft({ ...draft, [key]: toggle(draft[key], code) })}
                    />
                    {t(locale, `pref_${code}`)}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {show(4) || mode === "edit" ? (
        <section>
          <h2>{t(locale, "goals_help")}</h2>
          <div className="checks">
            {GOALS.map((code) => (
              <label key={code} className="chip">
                <input type="checkbox" checked={draft.goals.includes(code)} onChange={() => setDraft({ ...draft, goals: toggle(draft.goals, code) })} />
                {t(locale, `goal_${code}`)}
              </label>
            ))}
          </div>
          <p className="meta">{t(locale, "no_medical")}</p>
        </section>
      ) : null}

      <div className="actions" style={{ marginTop: 16 }}>
        {mode === "wizard" && step > 0 ? (
          <button className="btn btn-secondary" type="button" onClick={() => setStep(step - 1)}>{t(locale, "back")}</button>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {mode === "wizard" && step < 4 ? t(locale, "next") : t(locale, "save")}
        </button>
      </div>
    </form>
  );
}
