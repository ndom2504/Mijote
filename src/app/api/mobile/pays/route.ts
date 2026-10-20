import { z } from "zod";
import { COUNTRIES } from "@/lib/countries";
import { fail, json, readJson, api } from "@/server/http";
import { setRegistrationCountry } from "@/server/profile/service";

const codes = COUNTRIES.map((country) => country.code) as [string, ...string[]];

export const POST = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const parsed = z.object({ countryCode: z.enum(codes) }).safeParse(await readJson(request));
  if (!parsed.success) return fail("invalid", 400);
  const result = await setRegistrationCountry(user.id, parsed.data.countryCode);
  if (!result.ok) return fail(result.error, 400);
  return json({ ok: true });
}, { auth: true });
