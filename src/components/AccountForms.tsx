"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/constants";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

export function AccountForms({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {message ? <p className="notice info" role="status">{message}</p> : null}
      <p><a className="btn btn-secondary" href="/api/account">{t(locale, "export")}</a></p>
      <form
        className="panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            await send("/api/auth/password", "POST", {
              current: form.get("current"),
              password: form.get("password"),
              confirm: form.get("confirm"),
            });
            setMessage(t(locale, "password_changed"));
            event.currentTarget.reset();
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
          }
        }}
      >
        <h2>{t(locale, "new_password")}</h2>
        <label htmlFor="current">{t(locale, "current_password")}</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required />
        <label htmlFor="password">{t(locale, "new_password")}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <label htmlFor="confirm">{t(locale, "confirm_password")}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        <button className="btn btn-primary" type="submit">{t(locale, "save")}</button>
      </form>
      <form
        className="panel"
        onSubmit={async (event) => {
          event.preventDefault();
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            await send("/api/auth/account", "DELETE", { password: form.get("password") });
            router.push("/");
            router.refresh();
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
          }
        }}
      >
        <h2>{t(locale, "delete_account")}</h2>
        <p>{t(locale, "delete_help")}</p>
        <label htmlFor="delete-password">{t(locale, "password")}</label>
        <input id="delete-password" name="password" type="password" autoComplete="current-password" required />
        <button className="btn btn-secondary" type="submit">{t(locale, "delete_account")}</button>
      </form>
      <p className="meta">{t(locale, "no_medical")}</p>
    </div>
  );
}
