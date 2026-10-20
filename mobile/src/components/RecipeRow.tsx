import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Recipe } from "../domain/types";
import { difficultyLabel, flagEmoji, totalMinutes } from "../lib/format";
import { colors, fonts, radius, softShadow } from "../theme";
import { AllergyBadge } from "./AllergyBadge";
import { RecipePhoto } from "./RecipePhoto";

interface Props {
  recipe: Recipe;
  onOpen: () => void;
  /** Allergies déclarées : une recette qui y touche reçoit un avertissement visible. */
  declaredAllergens: string[];
  actions?: ReactNode;
}

export function RecipeRow({ recipe, onOpen, declaredAllergens, actions }: Props) {
  const origin = recipe.origin ? `${flagEmoji(recipe.origin.code)} ${recipe.origin.name}`.trim() : null;
  return (
    // La zone « ouvrir » et les actions (cœur, signet) sont des frères : jamais de boutons imbriqués.
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${recipe.name}. Ouvrir la recette.`} onPress={onOpen} style={styles.main}>
        <RecipePhoto uri={recipe.photoUrl} style={styles.thumb} />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>
            {recipe.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {[origin, `${totalMinutes(recipe)} min`, difficultyLabel(recipe.difficulty)].filter(Boolean).join(" · ")}
          </Text>
          <AllergyBadge recipe={recipe} declared={declaredAllergens} />
        </View>
      </Pressable>
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.tile, padding: 10, ...softShadow },
  main: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  thumb: { width: 76, height: 76, borderRadius: 18, overflow: "hidden" },
  info: { flex: 1, gap: 4 },
  name: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 18, lineHeight: 23 },
  meta: { color: colors.muted, fontSize: 14 },
});
