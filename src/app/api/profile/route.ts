import { fail, json, readJson, api } from "@/server/http";
import { getProfile, profileSchema, saveProfile } from "@/server/profile/service";

export const GET = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  return json({ profile: await getProfile(user.id) });
}, { auth: true });

export const PUT = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  const parsed = profileSchema.safeParse(await readJson(request));
  if (!parsed.success) return fail("invalid", 400);
  const result = await saveProfile(user.id, parsed.data);
  if (!result.ok) return fail(result.error, 400);
  return json({ ok: true });
}, { auth: true });
