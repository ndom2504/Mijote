import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COUNTRIES } from "../data/countries";
import { flagEmoji, normalizeSearch } from "../lib/format";
import { colors, fonts, radius } from "../theme";

interface ListProps {
  selected: string | null;
  onSelect: (code: string) => void;
  busy?: boolean;
}

/** Liste de pays avec recherche, utilisée à la première utilisation et dans le sélecteur. */
export function CountryList({ selected, onSelect, busy }: ListProps) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const needle = normalizeSearch(query);
    return COUNTRIES.filter((country) => normalizeSearch(country.name).includes(needle));
  }, [query]);

  return (
    <View style={styles.listWrap}>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un pays"
        placeholderTextColor="#6B7F73"
        accessibilityLabel="Rechercher un pays"
        autoCapitalize="none"
        autoCorrect={false}
        style={styles.search}
      />
      <FlatList
        data={items}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.items}
        ListEmptyComponent={<Text style={styles.empty}>Aucun pays ne correspond à cette recherche.</Text>}
        renderItem={({ item }) => {
          const on = item.code === selected;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !!busy }}
              disabled={busy}
              onPress={() => onSelect(item.code)}
              style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && styles.pressed]}
            >
              <Text style={styles.flag}>{flagEmoji(item.code)}</Text>
              <Text style={styles.itemText}>{item.name}</Text>
              {on ? <Ionicons name="checkmark-circle" size={22} color={colors.forest} /> : null}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

interface SheetProps {
  visible: boolean;
  selected: string | null;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CountrySheet({ visible, selected, onSelect, onClose }: SheetProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Choisir un pays</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.close} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.forest} />
          </Pressable>
        </View>
        <Text style={styles.hint}>Votre pays oriente la cuisine proposée. Aucune localisation n'est demandée.</Text>
        <CountryList
          selected={selected}
          onSelect={(code) => {
            onSelect(code);
            onClose();
          }}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 20 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  sheetTitle: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 26 },
  close: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  hint: { color: colors.muted, fontSize: 14, lineHeight: 20, marginBottom: 12 },
  listWrap: { flex: 1 },
  search: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    minHeight: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    color: colors.ink,
  },
  items: { paddingVertical: 12, gap: 8 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  itemOn: { backgroundColor: colors.pale, borderColor: colors.forest },
  flag: { fontSize: 24 },
  itemText: { flex: 1, color: colors.ink, fontSize: 17 },
  empty: { color: colors.muted, textAlign: "center", marginTop: 24 },
  pressed: { opacity: 0.85 },
});
