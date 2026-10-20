import { one, query } from "@/server/db/client";

/** Taille maximale de l'image décodée : l'application la réduit avant l'envoi (≈ 512 px, quelques dizaines de Ko). */
export const MAX_AVATAR_BYTES = 400 * 1024;
const MAX_BASE64_CHARS = Math.ceil((MAX_AVATAR_BYTES * 4) / 3) + 8;

export type AvatarError = "invalid_image" | "too_large";

export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** Le type vient du contenu réel (octets d'en-tête), jamais de ce que le client déclare. SVG et autres sont refusés. */
export function detectImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (bytes.length >= 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

/** Accepte du base64 brut ou une adresse `data:image/...;base64,`. */
export function decodeImage(input: string): { ok: true; bytes: Buffer; type: ImageType } | { ok: false; error: AvatarError } {
  const body = input.replace(/^data:[^,]*;base64,/i, "").replace(/\s+/g, "");
  if (body.length > MAX_BASE64_CHARS) return { ok: false, error: "too_large" };
  if (body.length < 16 || body.length % 4 !== 0 || !BASE64.test(body)) return { ok: false, error: "invalid_image" };
  const bytes = Buffer.from(body, "base64");
  if (bytes.length > MAX_AVATAR_BYTES) return { ok: false, error: "too_large" };
  const type = detectImageType(bytes);
  return type ? { ok: true, bytes, type } : { ok: false, error: "invalid_image" };
}

export interface Avatar {
  uri: string;
  updatedAt: string;
}

export async function getAvatar(userId: string): Promise<Avatar | null> {
  const row = await one<{ content_type: string; data: string; updated_at: string }>(
    "SELECT content_type, data, updated_at FROM user_avatars WHERE user_id = $1",
    [userId],
  );
  return row ? { uri: `data:${row.content_type};base64,${row.data}`, updatedAt: row.updated_at } : null;
}

export async function saveAvatar(userId: string, input: string): Promise<{ ok: true; avatar: Avatar } | { ok: false; error: AvatarError }> {
  const decoded = decodeImage(input);
  if (!decoded.ok) return decoded;
  const updatedAt = new Date().toISOString();
  const data = decoded.bytes.toString("base64");
  await query(
    `INSERT INTO user_avatars (user_id, content_type, data, updated_at) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id) DO UPDATE SET content_type = EXCLUDED.content_type, data = EXCLUDED.data, updated_at = EXCLUDED.updated_at`,
    [userId, decoded.type, data, updatedAt],
  );
  return { ok: true, avatar: { uri: `data:${decoded.type};base64,${data}`, updatedAt } };
}

export async function removeAvatar(userId: string): Promise<void> {
  await query("DELETE FROM user_avatars WHERE user_id = $1", [userId]);
}
