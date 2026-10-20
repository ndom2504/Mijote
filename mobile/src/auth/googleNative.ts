import { Platform } from "react-native";
import { authConfig } from "./config";
import { signInWithGoogle, type GoogleDeps, type GoogleResult } from "./googleSignIn";

/** Charge le module natif à la demande : absent dans Expo Go et sur le web, sans plantage. */
function loadNative(): ReturnType<GoogleDeps["load"]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-google-signin/google-signin");
  } catch {
    return null;
  }
}

/** Connexion Google avec la configuration réelle de l'application. */
export function googleSignIn(): Promise<GoogleResult> {
  return signInWithGoogle({
    platform: Platform.OS,
    webClientId: authConfig.googleWebClientId,
    iosClientId: authConfig.googleIosClientId,
    load: loadNative,
  });
}
