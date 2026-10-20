import { z } from "zod";
import { fail, json, readJson, rateLimit, api } from "@/server/http";
import { getAvatar, removeAvatar, saveAvatar } from "@/server/avatar/service";

export const GET = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  return json({ avatar: await getAvatar(user.id) });
}, { auth: true });

const body = z.object({ image: z.string().min(16) });

/** Remplace la photo de profil. L'image doit être un JPEG, un PNG ou un WebP de 400 Ko au plus. */
export const PUT = api(async (request, user) => {
  if (!user) return fail("unauthenticated", 401);
  if (!rateLimit(`avatar:${user.id}`, 10, 60_000)) return fail("rate", 429);
  const parsed = body.safeParse(await readJson(request));
  if (!parsed.success) return fail("invalid_image", 400);
  const result = await saveAvatar(user.id, parsed.data.image);
  return result.ok ? json({ avatar: result.avatar }) : fail(result.error, result.error === "too_large" ? 413 : 400);
}, { auth: true });

export const DELETE = api(async (_request, user) => {
  if (!user) return fail("unauthenticated", 401);
  await removeAvatar(user.id);
  return json({ ok: true });
}, { auth: true });
