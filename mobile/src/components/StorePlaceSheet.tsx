import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ApiError } from "../data/client";
import { storesErrorMessage } from "../domain/stores";
import type { StorePlace } from "../domain/types";
import { colors, fonts, radius } from "../theme";

interface Props {
  visible: boolean;
  /** Recherche d'une ville, d'un quartier ou d'un code postal canadien. */
  search: (term: string) => Promise<StorePlace[]>;
  /** Lieu actuellement choisi sur l'appareil (pour proposer de revenir au lieu du profil). */
  hasChosenPlace: boolean;
  onSelect: (place: StorePlace) => void;
  onReset: () => void;
  onClose: () => void;
}

/** Choix du lieu où chercher des épiceries : ville, quartier ou code postal du Canada. */
export function StorePlaceSheet({ visible, search, hasChosenPlace, onSelect, onReset, onClose }: Props) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<StorePlace[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorCode, setErrorCode] = useState("unreachable");

  useEffect(() => {
    if (!visible) {
      setTerm("");
      setResults([]);
      setStatus("idle");
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    if (term.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    // Le serveur limite le rythme des recherches : on attend la fin de la saisie.
    const timer = setTimeout(() => {
      search(term.trim())
        .then((places) => {
          if (cancelled) return;
          setResults(places);
          setStatus("idle");
        })
        .catch((caught) => {
          if (cancelled) return;
          setErrorCode(caught instanceof ApiError ? caught.message : "unreachable");
          setStatus("error");
        });
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, visible, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Où chercher ?</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.close} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.forest} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Écris une ville, un quartier ou un code postal du Canada (ex. « Saguenay », « H2X » ou « M5V 2T6 »). Aucune localisation GPS n'est demandée.</Text>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Ville ou code postal"
          placeholderTextColor="#6B7F73"
          accessibilityLabel="Rechercher une ville ou un code postal"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={80}
          style={styles.search}
        />
        {hasChosenPlace ? (
          <Pressable accessibilityRole="button" onPress={onReset} style={styles.reset}>
            <Ionicons name="refresh-outline" size={20} color={colors.forest} />
            <Text style={styles.resetText}>Revenir au lieu de mon profil</Text>
          </Pressable>
        ) : null}
        {status === "loading" ? <ActivityIndicator color={colors.forest} style={{ marginTop: 16 }} /> : null}
        {status === "error" ? (
          <Text style={styles.error} accessibilityRole="alert">
            {storesErrorMessage(errorCode)}
          </Text>
        ) : null}
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.lat},${item.lon},${item.label}`}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          ListEmptyComponent={<Text style={styles.empty}>{status === "idle" && term.trim().length >= 2 ? "Aucun lieu ne correspond." : ""}</Text>}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={item.label} onPress={() => onSelect(item)} style={({ pressed }) => [styles.place, pressed && { opacity: 0.85 }]}>
              <Ionicons name="location-outline" size={22} color={colors.forest} />
              <Text style={styles.placeName}>{item.label}</Text>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 26 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  search: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, minHeight: 50, paddingHorizontal: 16, fontSize: 16, color: colors.ink, marginTop: 12 },
  reset: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 },
  resetText: { color: colors.forest, fontSize: 15, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 14, fontWeight: "600", marginTop: 12, lineHeight: 20 },
  place: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  placeName: { flex: 1, color: colors.ink, fontSize: 17 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 24 },
});
