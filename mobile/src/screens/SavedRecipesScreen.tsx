import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { RecipeRow } from "../components/RecipeRow";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { loadErrorMessage } from "../lib/errors";
import { useNav } from "../navigation/NavContext";
import { usePersonal } from "../state/Personal";
import { colors, radius } from "../theme";

export function SavedRecipesScreen() {
  const { back, openRecipe } = useNav();
  const personal = usePersonal();
  const declared = personal.profile?.allergens ?? [];

  return (
    <Screen>
      <ScreenHeader title="Recettes sauvegardées" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        {personal.savedStatus === "loading" && personal.saved.length === 0 ? <LoadingCard label="Chargement de tes recettes…" /> : null}
        {personal.savedStatus === "error" ? (
          <ErrorCard title="Oups, tes recettes n'ont pas chargé" message={loadErrorMessage(null, "tes recettes sauvegardées")} onRetry={personal.reloadSaved} />
        ) : null}
        {personal.savedStatus === "ready" && personal.saved.length === 0 ? (
          <EmptyCard title="Rien de sauvegardé" message="Touche le signet d'une recette pour la garder ici, à part de tes favoris." />
        ) : null}
        {personal.saved.map((recipe) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            declaredAllergens={declared}
            onOpen={() => openRecipe(recipe)}
            actions={
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Retirer ${recipe.name} des recettes sauvegardées`}
                onPress={() => void personal.toggleSaved(recipe)}
                style={styles.bookmark}
                hitSlop={6}
              >
                <Ionicons name="bookmark" size={22} color={colors.forest} />
              </Pressable>
            }
          />
        ))}
        <View />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, gap: 12, paddingBottom: 32 },
  bookmark: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
});
