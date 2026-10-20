import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { allergenHits, warningText } from "../domain/allergens";
import type { Recipe } from "../domain/types";
import { colors, radius } from "../theme";

/** Avertissement visible lorsqu'une recette touche à une allergie déclarée ; ne rend rien sinon. */
export function AllergyBadge({ recipe, declared }: { recipe: Pick<Recipe, "allergens" | "mayContain">; declared: string[] }) {
  const text = warningText(allergenHits(recipe, declared));
  if (!text) return null;
  return (
    <View style={styles.badge} accessibilityRole="alert" accessibilityLabel={`Attention. ${text}`}>
      <Ionicons name="warning" size={14} color={colors.danger} />
      <Text style={styles.text} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.dangerBg,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  text: { color: colors.danger, fontSize: 12.5, fontWeight: "700", flexShrink: 1 },
});
