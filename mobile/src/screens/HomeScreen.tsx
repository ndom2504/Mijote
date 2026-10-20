import { Ionicons } from "@expo/vector-icons";
import { RefreshControl, ScrollView, StyleSheet, Pressable, Text, View } from "react-native";
import { BrandHeader, initialsOf } from "../components/BrandHeader";
import { Chip } from "../components/Chip";
import { ExploreCard } from "../components/ExploreCard";
import { RecipeHeroCard } from "../components/RecipeHeroCard";
import { Screen } from "../components/Screen";
import { StatCard } from "../components/StatCard";
import { DemoBanner, EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { allergenHits, isUnsafe, warningText } from "../domain/allergens";
import { greetingFor, preferenceChips } from "../domain/preferences";
import { loadErrorMessage } from "../lib/errors";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts } from "../theme";

/** Tableau de bord personnel : salutation, vrais compteurs, recommandation, préférences, raccourcis. */
export function HomeScreen() {
  const data = useAppData();
  const personal = usePersonal();
  const { goTab, openRecipe, openTrip, openPreferences, openSaved } = useNav();
  const profile = personal.profile;
  const declared = profile?.allergens ?? [];
  const recipe = data.pick?.recipe ?? null;
  const hits = recipe ? allergenHits(recipe, declared) : null;
  const blocked = hits ? isUnsafe(hits) : false;
  const refreshing = data.status === "loading" && data.pick !== null;

  const refresh = () => {
    data.reload();
    data.reloadFavorites();
    personal.reloadProfile();
    personal.reloadSaved();
    personal.reloadLists();
  };

  const { chips, extra } = profile ? preferenceChips(profile) : { chips: [], extra: 0 };

  return (
    <Screen>
      <Ionicons name="leaf" size={90} color={colors.sage} style={styles.leafLeft} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.forest} colors={[colors.forest]} />}
      >
        <BrandHeader initials={initialsOf(profile?.firstName)} photoUri={personal.avatarUri} onPressProfile={() => goTab("profile")} />

        {data.source === "demo" ? <DemoBanner /> : null}

        <View style={styles.greeting}>
          <Text style={styles.hello} accessibilityRole="header">
            {greetingFor(new Date().getHours(), profile?.firstName ?? "")}
          </Text>
          <Text style={styles.subtitle}>Voici ton espace personnel.</Text>
          <View style={styles.underline} />
        </View>

        <View style={styles.stats}>
          <StatCard icon="bookmark-outline" value={personal.stats.saved} label={"Recettes\nsauvegardées"} onPress={openSaved} />
          <StatCard icon="heart-outline" value={personal.stats.favorites} label="Favoris" onPress={() => goTab("favorites")} />
          <StatCard icon="cart-outline" value={personal.stats.lists} label={"Listes\nd'épicerie"} onPress={() => goTab("grocery")} />
        </View>

        <View style={styles.block}>
          {data.status === "loading" && !data.pick ? <LoadingCard /> : null}
          {data.status === "error" ? (
            <ErrorCard
              message={loadErrorMessage(data.errorCode, "la recette recommandée")}
              onRetry={data.reload}
              onDemo={data.source === "api" ? data.switchToDemo : undefined}
            />
          ) : null}
          {data.status === "empty" ? (
            <EmptyCard title="Aucune recette pour ce repas" message={data.pick?.notice ?? "Aucune recette ne convient pour le moment."} />
          ) : null}
          {data.status === "ready" && recipe && data.pick && !blocked ? (
            <>
              <RecipeHeroCard
                recipe={recipe}
                slot={data.pick.slot}
                isFavorite={data.isFavorite(recipe.id)}
                onToggleFavorite={() => void data.toggleFavorite(recipe)}
                onOpen={() => openRecipe(recipe)}
              />
              <View style={styles.notice} accessibilityLabel={data.pick.notice}>
                <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
                <Text style={styles.noticeText}>{data.pick.notice}</Text>
              </View>
            </>
          ) : null}
          {data.status === "ready" && recipe && blocked && hits ? (
            <EmptyCard
              title="Recette non proposée"
              message={`${warningText(hits)}. Elle touche à une de tes allergies : on ne te la recommande pas.`}
            />
          ) : null}
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            Tes préférences
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Gérer mes préférences" onPress={openPreferences} style={styles.manage} hitSlop={8}>
            <Text style={styles.manageText}>Gérer</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.forest} />
          </Pressable>
        </View>
        {personal.profileStatus === "loading" && !profile ? <Text style={styles.muted}>Chargement de tes préférences…</Text> : null}
        {personal.profileStatus === "error" && !profile ? (
          <View style={styles.inlineError} accessibilityRole="alert">
            <Text style={styles.inlineErrorText}>{loadErrorMessage(personal.profileError, "tes préférences")}</Text>
            <Pressable accessibilityRole="button" onPress={personal.reloadProfile} hitSlop={8}>
              <Text style={styles.retry}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}
        {profile ? (
          <View style={styles.chips}>
            {chips.map((chip) => (
              <Chip key={chip.key} label={chip.label} kind={chip.kind} />
            ))}
            {extra > 0 ? <Chip label={`+${extra}`} kind="info" icon="ellipsis-horizontal" /> : null}
          </View>
        ) : null}

        <Text style={[styles.sectionTitle, styles.discover]} accessibilityRole="header">
          À découvrir
        </Text>
        <View style={styles.explore}>
          <ExploreCard icon="airplane" art="earth" tint={["#CFE3F2", "#E4EEDC"]} title="Voyage culinaire" onPress={openTrip} />
          <ExploreCard icon="heart" art="nutrition" tint={["#F7D9CF", "#FBE9DC"]} title="Mes favoris" onPress={() => goTab("favorites")} />
          <ExploreCard icon="cart" art="basket" tint={["#E4EEDC", "#F2E7C9"]} title="Liste d'épicerie" onPress={() => goTab("grocery")} />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingBottom: 32 },
  leafLeft: { position: "absolute", top: 70, left: -34, opacity: 0.25, transform: [{ rotate: "-20deg" }] },
  greeting: { marginTop: 18, marginBottom: 14 },
  hello: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 34, lineHeight: 40 },
  subtitle: { color: colors.ink, fontSize: 17, marginTop: 2 },
  underline: { width: 56, height: 3, borderRadius: 2, backgroundColor: colors.sage, marginTop: 6 },
  stats: { flexDirection: "row", gap: 10 },
  block: { marginTop: 16, gap: 12 },
  notice: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 },
  noticeText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 10 },
  sectionTitle: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 22 },
  manage: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, justifyContent: "center" },
  manageText: { color: colors.forest, fontSize: 15, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  muted: { color: colors.muted, fontSize: 14 },
  inlineError: { backgroundColor: colors.dangerBg, borderRadius: 16, padding: 12, gap: 6 },
  inlineErrorText: { color: colors.ink, fontSize: 14, lineHeight: 20 },
  retry: { color: colors.forest, fontWeight: "800", fontSize: 15 },
  discover: { marginTop: 26, marginBottom: 12 },
  explore: { flexDirection: "row", gap: 10 },
});
