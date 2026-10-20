import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme";

/** Explique que des recettes sont masquées à cause des allergies, du régime ou des exclusions. */
export function CatalogNotice({ hiddenCount, onManage }: { hiddenCount: number; onManage: () => void }) {
  if (hiddenCount <= 0) return null;
  return (
    <View style={styles.box} accessibilityRole="summary">
      <Ionicons name="shield-checkmark-outline" size={20} color={colors.forest} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.text}>
          {`${hiddenCount} ${hiddenCount > 1 ? "recettes sont masquées" : "recette est masquée"} selon tes allergies, ton régime et tes ingrédients à éviter.`}
        </Text>
        <Pressable accessibilityRole="button" onPress={onManage} hitSlop={8}>
          <Text style={styles.link}>Voir mes préférences</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", gap: 10, alignItems: "flex-start", backgroundColor: colors.pale, borderRadius: 16, padding: 12 },
  text: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  link: { color: colors.forest, fontSize: 14, fontWeight: "800" },
});
