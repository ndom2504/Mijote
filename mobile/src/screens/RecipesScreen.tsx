import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { CatalogNotice } from "../components/CatalogNotice";
import { FavoriteButton } from "../components/FavoriteButton";
import { RecipeRow } from "../components/RecipeRow";
import { Screen } from "../components/Screen";
import { DemoBanner, EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { searchRecipes, visibleCatalog } from "../domain/catalog";
import { loadErrorMessage } from "../lib/errors";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts, radius } from "../theme";

export function RecipesScreen() {
  const data = useAppData();
  const personal = usePersonal();
  const { openRecipe, openPreferences } = useNav();
  const [term, setTerm] = useState("");
  const declared = personal.profile?.allergens ?? [];

  const { loadCatalog } = personal;
  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catalog = useMemo(() => (personal.catalog ? visibleCatalog(personal.catalog, declared) : null), [personal.catalog, declared]);
  const recipes = useMemo(() => (catalog ? searchRecipes(catalog.recipes, term) : []), [catalog, term]);

  const header = (
    <View style={styles.header}>
      <Text style={styles.title} accessibilityRole="header">
        Recettes
      </Text>
      {data.source === "demo" ? <DemoBanner /> : null}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={term}
          onChangeText={setTerm}
          placeholder="Une recette ou un pays"
          placeholderTextColor="#6B7F73"
          accessibilityLabel="Rechercher une recette ou un pays"
          autoCorrect={false}
          returnKeyType="search"
          style={styles.search}
        />
      </View>
      {catalog ? <CatalogNotice hiddenCount={catalog.hiddenCount} onManage={openPreferences} /> : null}
      {catalog ? (
        <Text style={styles.count}>{`${recipes.length} ${recipes.length > 1 ? "recettes" : "recette"}${term.trim() ? " trouvées" : ""}`}</Text>
      ) : null}
    </View>
  );

  return (
    <Screen>
      <FlatList
        data={personal.catalogStatus === "ready" ? recipes : []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={header}
        ListEmptyComponent={
          <View>
            {personal.catalogStatus === "loading" || personal.catalogStatus === "idle" ? <LoadingCard label="Chargement des recettes…" /> : null}
            {personal.catalogStatus === "error" ? (
              <ErrorCard title="Oups, les recettes n'ont pas chargé" message={loadErrorMessage(null, "les recettes")} onRetry={() => personal.loadCatalog(true)} />
            ) : null}
            {personal.catalogStatus === "ready" && term.trim() ? (
              <EmptyCard title="Aucun résultat" message="Aucune recette ne correspond à cette recherche. Essaie un autre mot." />
            ) : null}
            {personal.catalogStatus === "ready" && !term.trim() ? (
              <EmptyCard title="Aucune recette à afficher" message="Rien ne correspond à tes allergies et à tes préférences pour l'instant." />
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.rowWrap}>
            <RecipeRow
              recipe={item}
              declaredAllergens={declared}
              onOpen={() => openRecipe(item)}
              actions={<FavoriteButton active={data.isFavorite(item.id)} onPress={() => void data.toggleFavorite(item)} recipeName={item.name} />}
            />
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 32 },
  header: { gap: 12, marginBottom: 14 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 32 },
  searchBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, paddingHorizontal: 14, minHeight: 52 },
  search: { flex: 1, fontSize: 16, color: colors.ink, minHeight: 50 },
  count: { color: colors.muted, fontSize: 13.5, fontWeight: "700" },
  rowWrap: { marginBottom: 12 },
});
