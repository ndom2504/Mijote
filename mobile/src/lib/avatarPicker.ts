import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { AVATAR_JPEG_QUALITY, AVATAR_SIZE, centerSquare } from "../domain/avatar";

export type AvatarSource = "library" | "camera";

export type PickOutcome =
  | { status: "ok"; base64: string }
  | { status: "cancelled" }
  | { status: "denied" }
  | { status: "error" };

/**
 * Ouvre la galerie ou l'appareil photo, recadre au centre en carré, réduit à 512 px et compresse en JPEG.
 * L'image envoyée au serveur pèse ainsi quelques dizaines de Ko, quelle que soit la photo d'origine.
 */
export async function pickAvatar(source: AvatarSource): Promise<PickOutcome> {
  try {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return { status: "denied" };
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 1 };
    const result = source === "camera" ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return { status: "cancelled" };

    let context = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    const square = centerSquare(asset.width, asset.height);
    if (square) context = context.crop(square);
    const side = square?.width ?? Math.min(asset.width || AVATAR_SIZE, asset.height || AVATAR_SIZE);
    context = context.resize({ width: Math.min(AVATAR_SIZE, side || AVATAR_SIZE) });
    const image = await context.renderAsync();
    const saved = await image.saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: AVATAR_JPEG_QUALITY, base64: true });
    return saved.base64 ? { status: "ok", base64: saved.base64 } : { status: "error" };
  } catch {
    return { status: "error" };
  }
}
