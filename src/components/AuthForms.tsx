"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Locale } from "@/lib/constants";
import { send } from "@/lib/client";
import { errorText, t } from "@/lib/i18n";

function Frame({ locale, title, children }: { locale: Locale; title: string; children: React.ReactNode }) {
  return (
    <main id="contenu" className="wrap main">
      <Link className="logo" href="/"><span className="logo-mark" aria-hidden="true" />Mijoté</Link>
      <h1>{title}</h1>
      <div className="panel" style={{ maxWidth: 520 }}>{children}</div>
    </main>
  );
}

export function LoginForm({ locale, nextPath }: { locale: Locale; nextPath: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Frame locale={locale} title={t(locale, "login")}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            const result = await send("/api/auth/login", "POST", { email: form.get("email"), password: form.get("password") }) as { emailVerified?: boolean };
            router.push(result.emailVerified ? nextPath : "/verifier");
            router.refresh();
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
            setPending(false);
          }
        }}
      >
        {error ? <p className="notice error" role="alert">{error}</p> : null}
        <label htmlFor="email">{t(locale, "email")}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">{t(locale, "password")}</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={pending}>{t(locale, "login")}</button>
          <Link href="/inscription">{t(locale, "signup")}</Link>
          <Link href="/mot-de-passe-oublie">{t(locale, "forgot")}</Link>
        </div>
      </form>
    </Frame>
  );
}

export function RegisterForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Frame locale={locale} title={t(locale, "signup")}>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          setError(null);
          const form = new FormData(event.currentTarget);
          try {
            const result = await send("/api/auth/register", "POST", {
              email: form.get("email"),
              password: form.get("password"),
              confirm: form.get("confirm"),
            }) as { verificationCode?: string | null; mailSent?: boolean };
            if (result.verificationCode) setCode(result.verificationCode);
            else router.push("/verifier");
            router.refresh();
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
          } finally {
            setPending(false);
          }
        }}
      >
        {error ? <p className="notice error" role="alert">{error}</p> : null}
        {code ? <p className="notice info" role="status">{t(locale, "verify_help")} <strong>{code}</strong></p> : null}
        <label htmlFor="email">{t(locale, "email")}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <label htmlFor="password">{t(locale, "password")}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <label htmlFor="confirm">{t(locale, "confirm_password")}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        <div className="actions" style={{ marginTop: 16 }}>
          <button className="btn btn-primary" disabled={pending}>{t(locale, "signup")}</button>
          {code ? <Link className="btn btn-secondary" href="/verifier">{t(locale, "verify_title")}</Link> : null}
        </div>
      </form>
    </Frame>
  );
}

export function VerifyForm({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <Frame locale={locale} title={t(locale, "verify_title")}>
      <p>{t(locale, "verify_help")}</p>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {code ? <p className="notice info" role="status"><strong>{code}</strong></p> : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          setPending(true);
          const form = new FormData(event.currentTarget);
          try {
            await send("/api/auth/verify", "POST", { code: form.get("code") });
            router.push("/onboarding");
            router.refresh();
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
            setPending(false);
          }
        }}
      >
        <label htmlFor="code">{t(locale, "code")}</label>
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required />
        <div className="actions">
          <button className="btn btn-primary" disabled={pending}>{t(locale, "next")}</button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={async () => {
              const result = await send("/api/auth/verify", "POST", { resend: true }) as { code?: string | null };
              setCode(result.code ?? null);
            }}
          >
            {t(locale, "resend")}
          </button>
        </div>
      </form>
    </Frame>
  );
}

export function ForgotForm({ locale }: { locale: Locale }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <Frame locale={locale} title={t(locale, "forgot")}>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      {message ? <p className="notice info" role="status">{message}</p> : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            const result = await send("/api/auth/forgot", "POST", { email: form.get("email") }) as { mailSent?: boolean; debugToken?: string | null };
            if (result.debugToken) setMessage(`${t(locale, "debug_reset")} /reinitialiser?token=${result.debugToken}`);
            else setMessage(result.mailSent ? t(locale, "reset_sent") : t(locale, "error_mail_unconfigured"));
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
          }
        }}
      >
        <label htmlFor="email">{t(locale, "email")}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
        <button className="btn btn-primary" type="submit">{t(locale, "next")}</button>
      </form>
    </Frame>
  );
}

export function ResetForm({ locale, token }: { locale: Locale; token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <Frame locale={locale} title={t(locale, "reset")}>
      {error ? <p className="notice error" role="alert">{error}</p> : null}
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          try {
            await send("/api/auth/reset", "POST", { token, password: form.get("password"), confirm: form.get("confirm") });
            router.push("/connexion");
          } catch (caught) {
            setError(errorText(locale, caught instanceof Error ? caught.message : "server"));
          }
        }}
      >
        <label htmlFor="password">{t(locale, "new_password")}</label>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
        <label htmlFor="confirm">{t(locale, "confirm_password")}</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={10} required />
        <button className="btn btn-primary" type="submit">{t(locale, "save")}</button>
      </form>
    </Frame>
  );
}
