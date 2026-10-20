import { beforeAll, describe, expect, it } from "vitest";
import { confirmVerification, registerAccount } from "@/server/auth/service";
import { createMemoryDatabase, migrate, setDatabase } from "@/server/db/client";
import { decodeImage, detectImageType, getAvatar, MAX_AVATAR_BYTES, removeAvatar, saveAvatar } from "@/server/avatar/service";

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(40, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 2)]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(40, 3)]);

async function account(email: string): Promise<string> {
  const created = await registerAccount(email, "motdepasse-solide");
  if (!created.ok || !created.verificationCode) throw new Error("inscription");
  await confirmVerification(created.userId, created.verificationCode);
  return created.userId;
}

describe("photo de profil", () => {
  let alice = "";
  let bob = "";

  beforeAll(async () => {
    const db = await createMemoryDatabase();
    setDatabase(db);
    await migrate(db);
    alice = await account("alice-photo@example.com");
    bob = await account("bob-photo@example.com");
  });

  it("reconnaît le type d'après le contenu", () => {
    expect(detectImageType(JPEG)).toBe("image/jpeg");
    expect(detectImageType(PNG)).toBe("image/png");
    expect(detectImageType(WEBP)).toBe("image/webp");
    expect(detectImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImageType(Buffer.from("GIF89a-------"))).toBeNull();
  });

  it("refuse le base64 invalide, les formats non pris en charge et les images trop lourdes", () => {
    expect(decodeImage("pas du base64 !!")).toEqual({ ok: false, error: "invalid_image" });
    expect(decodeImage(Buffer.from("<svg>................</svg>").toString("base64"))).toEqual({ ok: false, error: "invalid_image" });
    const big = Buffer.concat([JPEG, Buffer.alloc(MAX_AVATAR_BYTES, 4)]);
    expect(decodeImage(big.toString("base64"))).toEqual({ ok: false, error: "too_large" });
  });

  it("accepte aussi une adresse data: et ignore le type déclaré", () => {
    const result = decodeImage(`data:text/html;base64,${PNG.toString("base64")}`);
    expect(result.ok && result.type).toBe("image/png");
  });

  it("enregistre, remplace et retire la photo, séparément pour chaque compte", async () => {
    expect(await getAvatar(alice)).toBeNull();
    const first = await saveAvatar(alice, JPEG.toString("base64"));
    expect(first.ok).toBe(true);
    expect((await getAvatar(alice))?.uri).toBe(`data:image/jpeg;base64,${JPEG.toString("base64")}`);
    expect(await getAvatar(bob)).toBeNull();

    await saveAvatar(alice, PNG.toString("base64"));
    expect((await getAvatar(alice))?.uri.startsWith("data:image/png;base64,")).toBe(true);

    await removeAvatar(alice);
    expect(await getAvatar(alice)).toBeNull();
  });

  it("ne touche pas la photo existante quand le nouvel envoi est refusé", async () => {
    await saveAvatar(bob, JPEG.toString("base64"));
    const refused = await saveAvatar(bob, Buffer.from("n'importe quoi de pas une image").toString("base64"));
    expect(refused.ok).toBe(false);
    expect((await getAvatar(bob))?.uri.startsWith("data:image/jpeg")).toBe(true);
  });
});
