import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";
import { FavoriteButton } from "../components/FavoriteButton";
import { RecipeRow } from "../components/RecipeRow";
import { Screen } from "../components/Screen";
import { EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts } from "../theme";

export function FavoritesScreen() {
  const data = useAppData();
  const personal = usePersonal();
  const { openRecipe } = useNav();
  const declared = personal.profile?.allergens ?? [];

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={data.reloadFavorites} tintColor={colors.forest} />}
      >
        <Text style={styles.title} accessibilityRole="header">
          Mes favoris
        </Text>
        {data.favoritesStatus === "loading" && data.favorites.length === 0 ? <LoadingCard label="Chargement de tes favoris…" /> : null}
        {data.favoritesStatus === "error" ? (
          <ErrorCard title="Oups, tes favoris n'ont pas chargé" message="Tes favoris n'ont pas pu être chargés. Réessaie dans un instant." onRetry={data.reloadFavorites} />
        ) : null}
        {data.favoritesStatus === "ready" && data.favorites.length === 0 ? (
          <EmptyCard title="Pas encore de favoris" message="Touche le cœur d'une recette pour la retrouver ici." />
        ) : null}
        {data.favorites.map((recipe) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            declaredAllergens={declared}
            onOpen={() => openRecipe(recipe)}
            actions={<FavoriteButton active onPress={() => void data.toggleFavorite(recipe)} recipeName={recipe.name} />}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 32 },
});
