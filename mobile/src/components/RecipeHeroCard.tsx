import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { MealSlot, Recipe } from "../domain/types";
import { difficultyLabel, flagEmoji, portionsLabel, SLOT_LABELS } from "../lib/format";
import { colors, fonts, radius, shadow } from "../theme";
import { FavoriteButton } from "./FavoriteButton";
import { RecipePhoto } from "./RecipePhoto";

interface Props {
  recipe: Recipe;
  slot: MealSlot;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onOpen: () => void;
}

/** Carte « Recette recommandée pour toi » du tableau de bord. */
export function RecipeHeroCard({ recipe, slot, isFavorite, onToggleFavorite, onOpen }: Props) {
  const origin = recipe.origin;
  const originText = origin ? `${flagEmoji(origin.code)} ${origin.name}`.trim() : "Cuisine du monde";
  const summary = `Recette recommandée pour toi. ${recipe.name}. ${origin ? origin.name : "Cuisine du monde"}. ${SLOT_LABELS[slot]}. Préparation ${recipe.prepMinutes} minutes, cuisson ${recipe.cookMinutes} minutes. ${portionsLabel(recipe.servings)}. ${difficultyLabel(recipe.difficulty)}.`;

  return (
    <View style={styles.card}>
      <RecipePhoto uri={recipe.photoUrl} style={styles.photo}>
        {/* Zone « ouvrir » et bouton cœur sont frères (jamais imbriqués) : un seul contrôle par zone tactile. */}
        <Pressable accessibilityRole="button" accessibilityLabel={`${summary} Ouvrir la recette.`} onPress={onOpen} style={StyleSheet.absoluteFill} />
        <View style={styles.top} pointerEvents="box-none">
          <View style={styles.badge} pointerEvents="none">
            <Ionicons name="star" size={16} color="#F5C84B" />
            <Text style={styles.badgeText} numberOfLines={1}>
              Recette recommandée pour toi
            </Text>
          </View>
          <FavoriteButton active={isFavorite} onPress={onToggleFavorite} recipeName={recipe.name} />
        </View>
      </RecipePhoto>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={3}>
          {recipe.name}
        </Text>
        <View style={styles.originRow}>
          <Text style={styles.origin}>{originText}</Text>
          <View style={styles.sep} />
          <Text style={styles.origin}>{SLOT_LABELS[slot]}</Text>
        </View>

        <View style={styles.meta}>
          <Meta icon="time-outline" top={`${recipe.prepMinutes} min`} bottom="préparation" />
          <Meta icon="flame-outline" top={`${recipe.cookMinutes} min`} bottom="cuisson" />
          <Meta icon="people-outline" top={String(recipe.servings)} bottom={recipe.servings > 1 ? "portions" : "portion"} />
          <Meta icon="stats-chart-outline" top={difficultyLabel(recipe.difficulty)} bottom="difficulté" />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Voir la recette ${recipe.name}`}
          onPress={onOpen}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Voir la recette</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.cream} />
        </Pressable>
      </View>
    </View>
  );
}

/** Une colonne : texte centré, icône en dessous (zone plus aérée, lecture verticale). */
function Meta({ icon, top, bottom }: { icon: keyof typeof Ionicons.glyphMap; top: string; bottom?: string }) {
  return (
    <View style={styles.metaItem}>
      <View style={styles.metaText}>
        <Text style={styles.metaTop} numberOfLines={1}>
          {top}
        </Text>
        <Text style={styles.metaBottom} numberOfLines={1}>
          {bottom ?? " "}
        </Text>
      </View>
      <Ionicons name={icon} size={22} color={colors.forest} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, overflow: "hidden", ...shadow },
  photo: { height: 170, padding: 12 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  badge: {
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(24,60,50,0.92)",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  badgeText: { color: colors.cream, fontSize: 13.5, fontWeight: "700", flexShrink: 1 },
  body: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 16, gap: 12 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24, lineHeight: 30, textAlign: "center" },
  originRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  origin: { color: colors.ink, fontSize: 14.5, textAlign: "center" },
  sep: { width: 1, height: 18, backgroundColor: colors.line },
  meta: { flexDirection: "row", alignItems: "stretch", justifyContent: "space-between", marginTop: 6, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  metaItem: { flex: 1, alignItems: "center", gap: 8 },
  metaText: { alignItems: "center", gap: 1 },
  metaTop: { color: colors.ink, fontSize: 13, fontWeight: "700", textAlign: "center" },
  metaBottom: { color: colors.muted, fontSize: 11.5, textAlign: "center" },
  cta: {
    marginTop: 6,
    backgroundColor: colors.forest,
    borderRadius: radius.pill,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  ctaText: { color: colors.cream, fontSize: 17, fontWeight: "700" },
  pressed: { opacity: 0.85 },
});
