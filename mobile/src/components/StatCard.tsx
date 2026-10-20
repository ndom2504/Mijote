import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, softShadow } from "../theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  /** `null` tant que le chiffre n'est pas connu (chargement ou erreur) : jamais un 0 inventé. */
  value: number | null;
  label: string;
  onPress: () => void;
}

export function StatCard({ icon, value, label, onPress }: Props) {
  const text = value === null ? "—" : String(value);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value === null ? `${label.replace("\n", " ")} : non disponible` : `${value} ${label.replace("\n", " ")}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.top}>
        <Ionicons name={icon} size={26} color={colors.forest} />
        <Text style={styles.value}>{text}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 92,
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderRadius: radius.tile,
    paddingHorizontal: 10,
    paddingVertical: 12,
    ...softShadow,
  },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  value: { color: colors.forest, fontSize: 26, fontWeight: "800", lineHeight: 30 },
  label: { color: colors.ink, fontSize: 12, lineHeight: 15 },
  pressed: { opacity: 0.85 },
});
