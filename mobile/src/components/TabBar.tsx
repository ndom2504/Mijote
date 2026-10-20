import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNav, type Tab } from "../navigation/NavContext";
import { colors } from "../theme";

const TABS: { key: Tab; label: string; icon: keyof typeof Ionicons.glyphMap; active: keyof typeof Ionicons.glyphMap }[] = [
  { key: "home", label: "Accueil", icon: "home-outline", active: "home" },
  { key: "recipes", label: "Recettes", icon: "restaurant-outline", active: "restaurant" },
  { key: "grocery", label: "Épicerie", icon: "cart-outline", active: "cart" },
  { key: "favorites", label: "Favoris", icon: "heart-outline", active: "heart" },
  { key: "profile", label: "Profil", icon: "person-outline", active: "person" },
];

export function TabBar() {
  const { tab, goTab } = useNav();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 10) }]} accessibilityRole="tablist">
      {TABS.map((item) => {
        const selected = tab === item.key;
        return (
          <Pressable
            key={item.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={item.label}
            onPress={() => goTab(item.key)}
            style={styles.tab}
          >
            <Ionicons name={selected ? item.active : item.icon} size={28} color={selected ? colors.forest : colors.ink} />
            <Text style={[styles.label, selected && styles.labelActive]}>{item.label}</Text>
            <View style={[styles.indicator, selected && styles.indicatorOn]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: "center", minHeight: 56, gap: 2 },
  label: { fontSize: 12, color: colors.ink },
  labelActive: { color: colors.forest, fontWeight: "800" },
  indicator: { height: 3, width: 36, borderRadius: 2, backgroundColor: "transparent" },
  indicatorOn: { backgroundColor: colors.forest },
});
