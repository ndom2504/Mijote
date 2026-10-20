"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/constants";
import { t } from "@/lib/i18n";

type City = { code: string; name: string; region: string; postal: string };

export function CityField({
  locale,
  selected,
  onSelect,
}: {
  locale: Locale;
  selected: { code: string; name: string } | null;
  onSelect: (city: { code: string; name: string } | null) => void;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<City[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (term.trim().length < 2) {
      setResults([]);
      setNotice(null);
      return;
    }
    const handle = setTimeout(async () => {
      const response = await fetch(`/api/geo?q=${encodeURIComponent(term)}`);
      const data = (await response.json()) as { results: City[]; notice: string | null };
      setResults(data.results ?? []);
      setNotice(data.notice);
    }, 250);
    return () => clearTimeout(handle);
  }, [term]);

  return (
    <div>
      <label htmlFor="city">{t(locale, "city")}</label>
      <input id="city" value={term} onChange={(event) => setTerm(event.target.value)} autoComplete="off" />
      <p className="meta">{t(locale, "gps")}</p>
      {selected ? (
        <p>
          <strong>{selected.name}</strong>{" "}
          <button className="btn btn-secondary" type="button" onClick={() => onSelect(null)}>
            {t(locale, "close")}
          </button>
        </p>
      ) : null}
      {notice === "office_postal" ? <p className="meta">{t(locale, "office_postal")}</p> : null}
      {notice === "none" ? <p className="meta">{t(locale, "none_city")}</p> : null}
      <ul className="city-list">
        {results.map((city) => (
          <li key={city.code}>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                onSelect({ code: city.code, name: city.name });
                setTerm("");
                setResults([]);
              }}
            >
              {city.name} · {city.region} · {city.postal}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
