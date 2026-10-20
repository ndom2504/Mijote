import { cookies } from "next/headers";
import { currentUser } from "@/server/auth/current";
import type { Locale } from "@/lib/constants";

export async function getLocale(): Promise<Locale> {
  const user = await currentUser();
  if (user?.locale) return user.locale;
  const value = (await cookies()).get("mijote_locale")?.value;
  return value === "en" ? "en" : "fr";
}
