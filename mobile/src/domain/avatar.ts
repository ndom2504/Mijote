/** Côté (en pixels) de la photo de profil envoyée au serveur. */
export const AVATAR_SIZE = 512;
export const AVATAR_JPEG_QUALITY = 0.8;

export interface SquareCrop {
  originX: number;
  originY: number;
  width: number;
  height: number;
}

/** Carré centré dans l'image, ou `null` si l'image est déjà carrée (ou si ses dimensions sont inconnues). */
export function centerSquare(width: number, height: number): SquareCrop | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w === h) return null;
  const side = Math.min(w, h);
  return { originX: Math.floor((w - side) / 2), originY: Math.floor((h - side) / 2), width: side, height: side };
}

/** Message sous le sélecteur quand l'accès à l'appareil photo est refusé. */
export const CAMERA_DENIED_MESSAGE = "L'accès à l'appareil photo est refusé. Autorise-le dans les réglages de ton téléphone, ou choisis une photo dans ta galerie.";
export const PICK_FAILED_MESSAGE = "La photo n'a pas pu être préparée. Essaie avec une autre image.";
