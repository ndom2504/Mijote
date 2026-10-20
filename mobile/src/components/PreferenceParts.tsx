import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { Place } from "../domain/types";
import { colors, fonts, radius, softShadow } from "../theme";

/** Carte de section des préférences. Le ton « danger » est réservé aux allergies. */
export function SectionCard({
  title,
  icon,
  hint,
  tone = "default",
  children,
}: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  hint?: string;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  const danger = tone === "danger";
  return (
    <View style={[styles.card, danger && styles.cardDanger]} accessibilityLabel={title}>
      <View style={styles.head}>
        <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.forest} />
        <Text style={[styles.title, danger && styles.titleDanger]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {hint ? <Text style={[styles.hint, danger && styles.hintDanger]}>{hint}</Text> : null}
      {children}
    </View>
  );
}

export function Wrap({ children }: { children: ReactNode }) {
  return <View style={styles.wrap}>{children}</View>;
}

export function SubTitle({ children }: { children: string }) {
  return <Text style={styles.sub}>{children}</Text>;
}

/** Compteur − / + (portions). */
export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (next: number) => void; label: string }) {
  return (
    <View style={styles.stepper} accessibilityLabel={`${label} : ${value}`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Moins de ${label.toLocaleLowerCase("fr")}`}
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={[styles.stepButton, value <= min && styles.stepDisabled]}
      >
        <Ionicons name="remove" size={22} color={colors.forest} />
      </Pressable>
      <Text style={styles.stepValue}>{value}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Plus de ${label.toLocaleLowerCase("fr")}`}
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={[styles.stepButton, value >= max && styles.stepDisabled]}
      >
        <Ionicons name="add" size={22} color={colors.forest} />
      </Pressable>
    </View>
  );
}

/** Étiquette retirable (ingrédient à éviter). */
export function RemovableTag({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Retirer ${label}`} onPress={onRemove} hitSlop={8} style={styles.tagX}>
        <Ionicons name="close" size={16} color={colors.forest} />
      </Pressable>
    </View>
  );
}

/** Champ + bouton « Ajouter » ; renvoie un message d'erreur ou `null` si l'ajout a réussi. */
export function TagInput({ placeholder, onAdd }: { placeholder: string; onAdd: (value: string) => string | null }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const submit = () => {
    const message = onAdd(value);
    setError(message);
    if (!message) setValue("");
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.tagRow}>
        <TextInput
          value={value}
          onChangeText={(text) => {
            setValue(text);
            setError(null);
          }}
          onSubmitEditing={submit}
          returnKeyType="done"
          placeholder={placeholder}
          placeholderTextColor="#6B7F73"
          accessibilityLabel={placeholder}
          style={styles.tagInput}
        />
        <Pressable accessibilityRole="button" accessibilityLabel="Ajouter l'ingrédient à éviter" onPress={submit} style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.cream} />
        </Pressable>
      </View>
      {error ? (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

interface MunicipalityProps {
  visible: boolean;
  search: (term: string) => Promise<Place[]>;
  currentName: string | null;
  onSelect: (place: Place | null) => void;
  onClose: () => void;
}

/** Choix de la municipalité (Québec), d'où l'on tire la région. */
export function MunicipalitySheet({ visible, search, currentName, onSelect, onClose }: MunicipalityProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");

  useEffect(() => {
    if (!visible) return;
    if (term.trim().length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    const timer = setTimeout(() => {
      search(term.trim())
        .then((places) => {
          if (cancelled) return;
          setResults(places);
          setStatus("idle");
        })
        .catch(() => {
          if (!cancelled) setStatus("error");
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [term, visible, search]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Ma municipalité</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.close} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.forest} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Ta région en est déduite pour la saisonnalité. Aucune localisation n'est demandée.</Text>
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Rechercher une municipalité"
          placeholderTextColor="#6B7F73"
          accessibilityLabel="Rechercher une municipalité"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          style={styles.search}
        />
        {currentName ? (
          <Pressable accessibilityRole="button" onPress={() => onSelect(null)} style={styles.clear}>
            <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
            <Text style={styles.clearText}>{`Retirer « ${currentName} »`}</Text>
          </Pressable>
        ) : null}
        {status === "loading" ? <ActivityIndicator color={colors.forest} style={{ marginTop: 16 }} /> : null}
        {status === "error" ? <Text style={styles.error}>La recherche n'a pas fonctionné. Réessaie.</Text> : null}
        <FlatList
          data={results}
          keyExtractor={(item) => item.code}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
          ListEmptyComponent={
            <Text style={styles.empty}>{status === "idle" && term.trim().length >= 2 ? "Aucune municipalité ne correspond." : ""}</Text>
          }
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" onPress={() => onSelect(item)} style={({ pressed }) => [styles.place, pressed && { opacity: 0.85 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.placeName}>{item.name}</Text>
                {item.region ? <Text style={styles.placeRegion}>{item.region}</Text> : null}
              </View>
            </Pressable>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 18, gap: 12, ...softShadow },
  cardDanger: { backgroundColor: colors.dangerBg, borderWidth: 1.5, borderColor: colors.danger },
  head: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 21, flex: 1 },
  titleDanger: { color: colors.danger },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  hintDanger: { color: colors.ink },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sub: { color: colors.muted, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 16, alignSelf: "flex-start" },
  stepButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  stepDisabled: { opacity: 0.4 },
  stepValue: { color: colors.forest, fontSize: 24, fontWeight: "800", minWidth: 32, textAlign: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingLeft: 14, paddingRight: 6, minHeight: 40 },
  tagText: { color: colors.ink, fontSize: 15 },
  tagX: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.pale },
  tagRow: { flexDirection: "row", gap: 8 },
  tagInput: { flex: 1, backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, minHeight: 48, paddingHorizontal: 14, fontSize: 16, color: colors.ink },
  addButton: { width: 48, height: 48, borderRadius: radius.input, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  sheet: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  sheetTitle: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 26 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  search: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, minHeight: 50, paddingHorizontal: 16, fontSize: 16, color: colors.ink, marginTop: 8 },
  clear: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48 },
  clearText: { color: colors.danger, fontSize: 15, fontWeight: "700" },
  place: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, padding: 14, flexDirection: "row" },
  placeName: { color: colors.ink, fontSize: 17 },
  placeRegion: { color: colors.muted, fontSize: 13, marginTop: 2 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 24 },
});
