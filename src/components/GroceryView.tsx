"use client";

import { useState } from "react";
import { GROCERY_CATEGORIES, type GroceryCategory, type Locale } from "@/lib/constants";
import { formatQuantity } from "@/lib/quantity";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";
import { useRouter } from "next/navigation";

export type GroceryRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  category: GroceryCategory;
  checked: boolean;
  mergeNote: string | null;
};

export function GroceryView({ locale, items }: { locale: Locale; items: GroceryRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [copyText, setCopyText] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<GroceryCategory>("autres");

  async function run(body: unknown) {
    setError(null);
    try {
      await send("/api/grocery", "POST", body);
      router.refresh();
    } catch (caught) {
      setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
    }
  }

  return (
    <div>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      <div className="actions noprint">
        <button className="btn btn-secondary" type="button" onClick={() => window.print()}>{t(locale, "print")}</button>
        <a className="btn btn-secondary" href="/api/grocery?format=pdf">{t(locale, "pdf")}</a>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={async () => {
            const data = await send("/api/grocery", "GET");
            const text = String((data as { text?: string }).text ?? "");
            try {
              await navigator.clipboard.writeText(text);
              setCopyText(null);
              setError(null);
            } catch {
              setCopyText(text);
              setError(t(locale, "copy_failed"));
            }
          }}
        >
          {t(locale, "copy")}
        </button>
        <button className="btn btn-secondary" type="button" onClick={() => run({ action: "rebuild" })}>{t(locale, "recalculate")}</button>
      </div>
      {copyText ? <textarea readOnly value={copyText} /> : null}
      {items.length === 0 ? <p className="notice info">{t(locale, "empty_grocery")}</p> : null}
      {GROCERY_CATEGORIES.map((group) => {
        const rows = items.filter((item) => item.category === group);
        if (!rows.length) return null;
        return (
          <section key={group}>
            <h2>{t(locale, `cat_${group}`)}</h2>
            {rows.map((item) => (
              <div className="grocery-item" key={item.id}>
                <label>
                  <input type="checkbox" checked={item.checked} onChange={(event) => run({ action: "update", id: item.id, checked: event.target.checked })} />
                  <span className="sr">{t(locale, "bought")}</span>
                </label>
                <div>
                  <strong>{item.name}</strong>
                  <div className="meta">
                    {item.quantity == null ? "" : `${formatQuantity(item.quantity, locale)} ${item.unit ? t(locale, `unit_${item.unit}`) : ""}`}
                    {item.mergeNote ? ` · ${item.mergeNote}` : ""}
                  </div>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = String(new FormData(event.currentTarget).get("qty") ?? "");
                      void run({ action: "update", id: item.id, quantity: value === "" ? null : Number(value) });
                    }}
                  >
                    <label className="sr" htmlFor={`qty-${item.id}`}>{t(locale, "quantity")}</label>
                    <input id={`qty-${item.id}`} name="qty" type="number" min={0} step="any" defaultValue={item.quantity ?? ""} />
                  </form>
                </div>
                <button className="btn btn-secondary" type="button" onClick={() => run({ action: "delete", id: item.id })}>{t(locale, "close")}</button>
              </div>
            ))}
          </section>
        );
      })}
      <form
        className="panel noprint"
        onSubmit={(event) => {
          event.preventDefault();
          if (name.trim().length < 2) return;
          void run({ action: "add", name, quantity: null, unit: null, category });
          setName("");
        }}
      >
        <h2>{t(locale, "add_item")}</h2>
        <label htmlFor="item-name">{t(locale, "add_item")}</label>
        <input id="item-name" value={name} onChange={(event) => setName(event.target.value)} />
        <label htmlFor="item-cat">{t(locale, "cat_autres")}</label>
        <select id="item-cat" value={category} onChange={(event) => setCategory(event.target.value as GroceryCategory)}>
          {GROCERY_CATEGORIES.map((group) => <option key={group} value={group}>{t(locale, `cat_${group}`)}</option>)}
        </select>
        <button className="btn btn-primary" type="submit">{t(locale, "add_item")}</button>
      </form>
    </div>
  );
}
