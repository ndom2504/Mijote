import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { writeStoredPlace } from "./placeStore";

const KEY = "mijote_token";

export async function readToken(): Promise<string | null> {
  if (Platform.OS === "web") return localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}

export async function writeToken(token: string | null): Promise<void> {
  // À la déconnexion, le lieu choisi pour les épiceries ne reste pas pour la prochaine personne.
  if (!token) await writeStoredPlace(null);
  if (Platform.OS === "web") {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
    return;
  }
  if (token) await SecureStore.setItemAsync(KEY, token);
  else await SecureStore.deleteItemAsync(KEY);
}
