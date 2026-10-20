import { z } from "zod";
import { fail, json, readJson, api } from "@/server/http";
import { query } from "@/server/db/client";

export const POST = api(async (request, user) => {
  const parsed = z.object({ locale: z.enum(["fr", "en"]) }).safeParse(await readJson(request));
  if (!parsed.success) return fail("invalid", 400);
  if (user) {
    await query("UPDATE profiles SET locale = $2, updated_at = $3 WHERE user_id = $1", [user.id, parsed.data.locale, new Date().toISOString()]);
  }
  const response = json({ ok: true });
  response.cookies.set("mijote_locale", parsed.data.locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
  });
  return response;
});
