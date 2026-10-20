import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { AddToListSheet } from "../components/AddToListSheet";
import { PrimaryButton } from "../components/Buttons";
import { FavoriteButton } from "../components/FavoriteButton";
import { RecipePhoto } from "../components/RecipePhoto";
import { Screen } from "../components/Screen";
import { allergenHits, allergenList } from "../domain/allergens";
import type { Recipe } from "../domain/types";
import { difficultyLabel, flagEmoji, portionsLabel, quantityLabel, totalMinutes } from "../lib/format";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts, radius } from "../theme";

export function RecipeDetailScreen({ recipe }: { recipe: Recipe }) {
  const { back } = useNav();
  const data = useAppData();
  const personal = usePersonal();
  const [listOpen, setListOpen] = useState(false);
  const origin = recipe.origin;
  const hits = allergenHits(recipe, personal.profile?.allergens ?? []);
  const saved = personal.isSaved(recipe.id);

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <RecipePhoto uri={recipe.photoUrl} style={styles.photo}>
          <View style={styles.photoBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={back} style={styles.back} hitSlop={8}>
              <Ionicons name="arrow-back" size={24} color={colors.forest} />
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: saved }}
                accessibilityLabel={saved ? `Retirer ${recipe.name} des recettes sauvegardées` : `Sauvegarder ${recipe.name}`}
                onPress={() => void personal.toggleSaved(recipe)}
                style={styles.back}
                hitSlop={6}
              >
                <Ionicons name={saved ? "bookmark" : "bookmark-outline"} size={24} color={colors.forest} />
              </Pressable>
              <FavoriteButton
                active={data.isFavorite(recipe.id)}
                onPress={() => void data.toggleFavorite(recipe)}
                recipeName={recipe.name}
              />
            </View>
          </View>
        </RecipePhoto>

        <View style={styles.sheet}>
          <Text style={styles.origin}>
            {origin ? `${flagEmoji(origin.code)} ${origin.name}`.trim() : "Cuisine du monde"}
          </Text>
          <Text style={styles.title} accessibilityRole="header">
            {recipe.name}
          </Text>
          <Text style={styles.description}>{recipe.description}</Text>

          <View style={styles.stats}>
            <Stat icon="time-outline" label="Préparation" value={`${recipe.prepMinutes} min`} />
            <Stat icon="flame-outline" label="Cuisson" value={`${recipe.cookMinutes} min`} />
            <Stat icon="restaurant-outline" label="Portions" value={portionsLabel(recipe.servings).split(" ")[0]} />
            <Stat icon="stats-chart-outline" label="Niveau" value={difficultyLabel(recipe.difficulty)} />
          </View>
          <Text style={styles.total}>{`Temps total : ${totalMinutes(recipe)} min`}</Text>

          {hits.contains.length > 0 || hits.mayContain.length > 0 ? (
            <View style={styles.warning} accessibilityRole="alert">
              <Ionicons name="warning" size={22} color={colors.danger} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.warningTitle}>Attention : allergie déclarée</Text>
                {hits.contains.length > 0 ? (
                  <Text style={styles.warningText}>{`Cette recette contient ${allergenList(hits.contains)}, que tu as déclaré comme allergie. Ne la prépare pas telle quelle.`}</Text>
                ) : null}
                {hits.mayContain.length > 0 ? (
                  <Text style={styles.warningText}>{`Elle peut contenir des traces de ${allergenList(hits.mayContain)} (contamination croisée possible).`}</Text>
                ) : null}
              </View>
            </View>
          ) : null}
          {recipe.allergens.length > 0 ? (
            <View style={styles.allergens} accessibilityRole="summary">
              <Ionicons name="alert-circle-outline" size={20} color={colors.forest} />
              <Text style={styles.allergenText}>{`Contient : ${allergenList(recipe.allergens)}.${recipe.mayContain.length > 0 ? ` Peut contenir : ${allergenList(recipe.mayContain)}.` : ""} Vérifie toujours les étiquettes des produits.`}</Text>
            </View>
          ) : null}

          <PrimaryButton label="Ajouter à une liste d'épicerie" icon="cart-outline" onPress={() => setListOpen(true)} style={styles.listButton} />

          <Text style={styles.section} accessibilityRole="header">
            Ingrédients
          </Text>
          {recipe.ingredients.map((item) => (
            <View key={item.name} style={styles.ingredient}>
              <View style={styles.dot} />
              <Text style={styles.ingredientText}>
                {item.name}
                {item.quantity == null ? "" : ` · ${quantityLabel(item.quantity, item.unit)}`}
              </Text>
            </View>
          ))}

          <Text style={styles.section} accessibilityRole="header">
            Préparation
          </Text>
          {recipe.steps.map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}

          {recipe.costNote ? <Text style={styles.meta}>{recipe.costNote}</Text> : null}
          {recipe.photoCredit ? <Text style={styles.meta}>{recipe.photoCredit}</Text> : null}
        </View>
      </ScrollView>
      <AddToListSheet recipe={listOpen ? recipe : null} onClose={() => setListOpen(false)} />
    </Screen>
  );
}

function Stat({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.stat} accessibilityLabel={`${label} : ${value}`}>
      <Ionicons name={icon} size={22} color={colors.forest} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  photo: { height: 300, padding: 16 },
  photoBar: { flexDirection: "row", justifyContent: "space-between" },
  back: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  sheet: {
    marginTop: -28,
    backgroundColor: colors.cream,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: 24,
  },
  origin: { color: colors.muted, fontSize: 15, fontWeight: "700" },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 30, lineHeight: 36, marginTop: 6 },
  description: { color: colors.ink, fontSize: 17, lineHeight: 25, marginTop: 10 },
  stats: { flexDirection: "row", gap: 8, marginTop: 20 },
  stat: { flex: 1, backgroundColor: colors.pale, borderRadius: 18, paddingVertical: 12, alignItems: "center", gap: 2 },
  statValue: { color: colors.forest, fontWeight: "800", fontSize: 15 },
  statLabel: { color: colors.muted, fontSize: 12 },
  total: { color: colors.muted, marginTop: 10, fontSize: 14 },
  actions: { flexDirection: "row", gap: 8 },
  warning: { flexDirection: "row", gap: 10, backgroundColor: colors.dangerBg, borderWidth: 1.5, borderColor: colors.danger, borderRadius: 16, padding: 14, marginTop: 16 },
  warningTitle: { color: colors.danger, fontWeight: "800", fontSize: 16 },
  warningText: { color: colors.ink, fontSize: 14.5, lineHeight: 20 },
  listButton: { marginTop: 16 },
  allergens: { flexDirection: "row", gap: 10, backgroundColor: colors.peach, borderRadius: 16, padding: 14, marginTop: 16 },
  allergenText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20 },
  section: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24, marginTop: 28, marginBottom: 10 },
  ingredient: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 34 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sage },
  ingredientText: { flex: 1, color: colors.ink, fontSize: 16, lineHeight: 23 },
  step: { flexDirection: "row", gap: 12, marginBottom: 14 },
  stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: colors.cream, fontWeight: "800" },
  stepText: { flex: 1, color: colors.ink, fontSize: 16, lineHeight: 24 },
  meta: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 16 },
});
