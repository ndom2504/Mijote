import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CatalogNotice } from "../components/CatalogNotice";
import { FavoriteButton } from "../components/FavoriteButton";
import { RecipeRow } from "../components/RecipeRow";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { groupByOrigin, visibleCatalog } from "../domain/catalog";
import type { Country } from "../domain/types";
import { loadErrorMessage } from "../lib/errors";
import { flagEmoji } from "../lib/format";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts, radius, softShadow } from "../theme";

/** Voyage culinaire : les pays du catalogue (recettes compatibles avec tes allergies et ton régime). */
export function TripScreen() {
  const { back, openTripCountry } = useNav();
  const personal = usePersonal();
  const declared = personal.profile?.allergens ?? [];
  const { loadCatalog } = personal;

  useEffect(() => {
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const catalog = useMemo(() => (personal.catalog ? visibleCatalog(personal.catalog, declared) : null), [personal.catalog, declared]);
  const groups = useMemo(() => (catalog ? groupByOrigin(catalog.recipes) : []), [catalog]);
  const { openPreferences } = useNav();

  return (
    <Screen>
      <ScreenHeader title="Voyage culinaire" onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.intro}>Explore les saveurs d'un pays à la fois. Seules les recettes qui respectent tes allergies et ton régime sont proposées.</Text>
        {personal.catalogStatus === "loading" || personal.catalogStatus === "idle" ? <LoadingCard label="Chargement des pays…" /> : null}
        {personal.catalogStatus === "error" ? (
          <ErrorCard title="Oups, le voyage n'a pas chargé" message={loadErrorMessage(null, "les recettes")} onRetry={() => personal.loadCatalog(true)} />
        ) : null}
        {catalog ? <CatalogNotice hiddenCount={catalog.hiddenCount} onManage={openPreferences} /> : null}
        {personal.catalogStatus === "ready" && groups.length === 0 ? (
          <EmptyCard title="Aucun pays à explorer" message="Aucune recette d'un pays précis ne correspond à tes préférences pour l'instant." />
        ) : null}
        {groups.map((group) => (
          <Pressable
            key={group.country.code}
            accessibilityRole="button"
            accessibilityLabel={`${group.country.name}, ${group.recipes.length} ${group.recipes.length > 1 ? "recettes" : "recette"}`}
            onPress={() => openTripCountry(group.country)}
            style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.flag}>{flagEmoji(group.country.code) || "🌍"}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{group.country.name}</Text>
              <Text style={styles.meta}>{`${group.recipes.length} ${group.recipes.length > 1 ? "recettes" : "recette"}`}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.forest} />
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

/** Recettes d'un pays du voyage culinaire. */
export function TripCountryScreen({ country }: { country: Country }) {
  const { back, openRecipe } = useNav();
  const data = useAppData();
  const personal = usePersonal();
  const declared = personal.profile?.allergens ?? [];
  const recipes = useMemo(() => {
    const catalog = personal.catalog ? visibleCatalog(personal.catalog, declared) : null;
    return catalog ? catalog.recipes.filter((recipe) => recipe.origin?.code === country.code) : [];
  }, [personal.catalog, declared, country.code]);

  return (
    <Screen>
      <ScreenHeader title={`${flagEmoji(country.code)} ${country.name}`.trim()} onBack={back} />
      <ScrollView contentContainerStyle={styles.content}>
        {recipes.length === 0 ? <EmptyCard title="Aucune recette" message="Aucune recette de ce pays ne correspond à tes préférences." /> : null}
        {recipes.map((recipe) => (
          <RecipeRow
            key={recipe.id}
            recipe={recipe}
            declaredAllergens={declared}
            onOpen={() => openRecipe(recipe)}
            actions={<FavoriteButton active={data.isFavorite(recipe.id)} onPress={() => void data.toggleFavorite(recipe)} recipeName={recipe.name} />}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, gap: 12, paddingBottom: 32 },
  intro: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, borderRadius: radius.tile, padding: 14, minHeight: 66, ...softShadow },
  flag: { fontSize: 30 },
  name: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 19 },
  meta: { color: colors.muted, fontSize: 14 },
});
