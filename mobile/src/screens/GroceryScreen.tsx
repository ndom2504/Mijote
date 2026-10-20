import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { PrimaryButton } from "../components/Buttons";
import { Screen } from "../components/Screen";
import { DemoBanner, EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { StorePlaceSheet } from "../components/StorePlaceSheet";
import { StoresCard } from "../components/StoresCard";
import { useNearbyStores } from "../state/useNearbyStores";
import { TextPromptSheet } from "../components/TextPromptSheet";
import { progressLabel } from "../domain/lists";
import { loadErrorMessage } from "../lib/errors";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts, radius, softShadow } from "../theme";

export function GroceryScreen() {
  const data = useAppData();
  const personal = usePersonal();
  const { openList } = useNav();
  const [creating, setCreating] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const stores = useNearbyStores(personal.services.stores, personal.report);

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={false} onRefresh={personal.reloadLists} tintColor={colors.forest} />}
      >
        <Text style={styles.title} accessibilityRole="header">
          Listes d'épicerie
        </Text>
        {data.source === "demo" ? <DemoBanner /> : null}
        <Text style={styles.intro}>Crée tes listes et ajoute-y les ingrédients d'une recette en un geste. Coche au fil des achats.</Text>

        <PrimaryButton label="Nouvelle liste" icon="add" onPress={() => setCreating(true)} />

        {personal.listsStatus === "loading" && personal.lists.length === 0 ? <LoadingCard label="Chargement de tes listes…" /> : null}
        {personal.listsStatus === "error" ? (
          <ErrorCard title="Oups, tes listes n'ont pas chargé" message={loadErrorMessage(null, "tes listes")} onRetry={personal.reloadLists} />
        ) : null}
        {personal.listsStatus === "ready" && personal.lists.length === 0 ? (
          <EmptyCard title="Aucune liste pour l'instant" message="Crée une première liste, ou ajoute les ingrédients d'une recette depuis sa fiche." />
        ) : null}

        {personal.lists.map((list) => {
          const ratio = list.itemCount > 0 ? list.checkedCount / list.itemCount : 0;
          return (
            <Pressable
              key={list.id}
              accessibilityRole="button"
              accessibilityLabel={`${list.name}. ${progressLabel(list.itemCount, list.checkedCount)}. Ouvrir la liste.`}
              onPress={() => openList(list.id, list.name)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <View style={styles.icon}>
                <Ionicons name="cart" size={24} color={colors.forest} />
              </View>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={2}>
                  {list.name}
                </Text>
                <Text style={styles.meta}>{progressLabel(list.itemCount, list.checkedCount)}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${Math.round(ratio * 100)}%` }]} />
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.forest} />
            </Pressable>
          );
        })}

        <StoresCard
          available={stores.available}
          status={stores.status}
          result={stores.result}
          errorCode={stores.errorCode}
          chosenPlace={stores.chosen !== null}
          onChoosePlace={() => setPlaceOpen(true)}
          onRetry={stores.reload}
        />

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
          <Text style={styles.noteText}>
            La liste hebdomadaire générée automatiquement à partir de ton menu reste disponible sur le site Mijoté. Ici, tu gères tes propres listes.
          </Text>
        </View>
      </ScrollView>

      <StorePlaceSheet
        visible={placeOpen}
        search={stores.search}
        hasChosenPlace={stores.chosen !== null}
        onSelect={(place) => {
          setPlaceOpen(false);
          void stores.choose(place);
        }}
        onReset={() => {
          setPlaceOpen(false);
          void stores.reset();
        }}
        onClose={() => setPlaceOpen(false)}
      />

      <TextPromptSheet
        visible={creating}
        title="Nouvelle liste"
        label="Nom de la liste"
        confirmLabel="Créer la liste"
        onClose={() => setCreating(false)}
        onSubmit={async (name) => {
          const result = await personal.createList(name);
          if (!result.ok) return result.message;
          openList(result.id, name.trim());
          return null;
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 32 },
  intro: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.tile, padding: 14, ...softShadow },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  info: { flex: 1, gap: 4 },
  name: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 19 },
  meta: { color: colors.muted, fontSize: 14 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.pale, overflow: "hidden", marginTop: 2 },
  fill: { height: 6, backgroundColor: colors.forest },
  pressed: { opacity: 0.85 },
  note: { flexDirection: "row", gap: 8, alignItems: "flex-start", paddingHorizontal: 4 },
  noteText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 18 },
});
