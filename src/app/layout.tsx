import type { Metadata, Viewport } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { getLocale } from "@/server/i18n/locale";
import { readyDatabase } from "@/server/db/init";
import { t } from "@/lib/i18n";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Mijoté", template: "%s · Mijoté" },
  description: "Bien manger, simplement. Planification des repas pour le Québec.",
};

export const viewport: Viewport = {
  themeColor: "#183C32",
  width: "device-width",
  initialScale: 1,
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await readyDatabase();
  const locale = await getLocale();
  return (
    <html lang={locale === "en" ? "en-CA" : "fr-CA"} className={`${outfit.variable} ${fraunces.variable}`}>
      <body>
        <a className="skip" href="#contenu">{t(locale, "skip")}</a>
        {children}
      </body>
    </html>
  );
}
