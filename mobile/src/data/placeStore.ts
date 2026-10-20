import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { parseStoredPlace } from "../domain/stores";
import type { StorePlace } from "../domain/types";

const KEY = "mijote_store_place";

/** Lieu choisi pour la recherche d'épiceries : gardé sur l'appareil, effacé à la déconnexion. */
export async function readStoredPlace(): Promise<StorePlace | null> {
  try {
    const raw = Platform.OS === "web" ? localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return parseStoredPlace(raw);
  } catch {
    return null;
  }
}

export async function writeStoredPlace(place: StorePlace | null): Promise<void> {
  try {
    if (Platform.OS === "web") {
      if (place) localStorage.setItem(KEY, JSON.stringify(place));
      else localStorage.removeItem(KEY);
      return;
    }
    if (place) await SecureStore.setItemAsync(KEY, JSON.stringify(place));
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Un lieu non conservé oblige seulement à le rechoisir : ce n'est pas bloquant.
  }
}
