import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DIAL_COUNTRIES } from "../data/dialCodes";
import { flagEmoji, normalizeSearch } from "../lib/format";
import { colors, fonts, radius } from "../theme";

interface Props {
  visible: boolean;
  selected: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

/** Sélecteur d'indicatif téléphonique avec recherche par pays ou par indicatif. */
export function DialCodeSheet({ visible, selected, onSelect, onClose }: Props) {
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const needle = normalizeSearch(query).replace(/^\+/, "");
    if (!needle) return DIAL_COUNTRIES;
    return DIAL_COUNTRIES.filter(
      (country) => normalizeSearch(country.name).includes(needle) || country.dial.replace("+", "").startsWith(needle),
    );
  }, [query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Indicatif du pays</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={styles.close} hitSlop={8}>
            <Ionicons name="close" size={26} color={colors.forest} />
          </Pressable>
        </View>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher un pays ou un indicatif"
          placeholderTextColor="#6B7F73"
          accessibilityLabel="Rechercher un pays ou un indicatif"
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
                accessibilityLabel={`${item.name}, indicatif ${item.dial}`}
                accessibilityState={{ selected: on }}
                onPress={() => {
                  onSelect(item.code);
                  setQuery("");
                  onClose();
                }}
                style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && styles.pressed]}
              >
                <Text style={styles.flag}>{flagEmoji(item.code)}</Text>
                <Text style={styles.itemText}>{item.name}</Text>
                <Text style={styles.dial}>{item.dial}</Text>
              </Pressable>
            );
          }}
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
  dial: { color: colors.muted, fontSize: 16, fontWeight: "600" },
  empty: { color: colors.muted, textAlign: "center", marginTop: 24 },
  pressed: { opacity: 0.85 },
});
