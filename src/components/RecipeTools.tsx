"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/constants";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

export function FavoriteButton({ locale, recipeId, favorite }: { locale: Locale; recipeId: string; favorite: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      className="btn btn-secondary"
      type="button"
      aria-pressed={favorite}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await send("/api/menus", "POST", { action: "favorite", recipeId, favorite: !favorite });
        router.refresh();
        setPending(false);
      }}
    >
      {favorite ? t(locale, "unfavorite") : t(locale, "favorite")}
    </button>
  );
}

type Substitution = { from: string; to: string; note: string };

export function RecipeAssist({ locale, recipeId }: { locale: Locale; recipeId: string }) {
  const [items, setItems] = useState<Substitution[] | null>(null);
  const [why, setWhy] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: "substitute" | "variant" | "explain") {
    setError(null);
    setNotice(null);
    try {
      const result = await send("/api/ai", "POST", { action, recipeId }) as {
        items?: Substitution[];
        fr?: string[];
        en?: string[];
        queued?: boolean;
        ai?: boolean;
      };
      if (action === "substitute") setItems(result.items ?? []);
      if (action === "explain") setWhy(locale === "en" ? result.en ?? [] : result.fr ?? []);
      if (action === "variant") setNotice(result.queued ? t(locale, "ai_queue") : t(locale, "ai_off"));
    } catch (caught) {
      setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
    }
  }

  return (
    <section className="panel">
      <div className="actions">
        <button className="btn btn-secondary" type="button" onClick={() => run("explain")}>{t(locale, "why")}</button>
        <button className="btn btn-secondary" type="button" onClick={() => run("substitute")}>{t(locale, "ai_sub")}</button>
        <button className="btn btn-secondary" type="button" onClick={() => run("variant")}>{t(locale, "ai_queue")}</button>
      </div>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {notice ? <p className="notice info" role="status">{notice}</p> : null}
      {why ? <ul>{why.map((line) => <li key={line}>{line}</li>)}</ul> : null}
      {items ? (
        items.length === 0 ? <p className="meta">{t(locale, "ai_sub")}</p> : (
          <ul>
            {items.map((item) => <li key={`${item.from}-${item.to}`}>{item.from} → {item.to}. {item.note}</li>)}
          </ul>
        )
      ) : null}
    </section>
  );
}
