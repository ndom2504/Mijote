import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { chainKindLabel, distanceLabel, freshnessNote, kindLabel, radiusNote, storesErrorMessage } from "../domain/stores";
import type { GroceryStore, NearbyStores, StoreChain } from "../domain/types";
import { colors, fonts, radius, softShadow } from "../theme";
import { PrimaryButton, SecondaryButton } from "./Buttons";

const VISIBLE_STORES = 5;

interface Props {
  available: boolean;
  status: "idle" | "loading" | "ready" | "error";
  result: NearbyStores | null;
  errorCode: string | null;
  chosenPlace: boolean;
  onChoosePlace: () => void;
  onRetry: () => void;
}

function openWebsite(url: string | null) {
  if (url && /^https?:\/\//i.test(url)) void Linking.openURL(url);
}

/** Épiceries du Canada près du lieu de la personne : commerces trouvés en ligne + bannières courantes de la province. */
export function StoresCard({ available, status, result, errorCode, chosenPlace, onChoosePlace, onRetry }: Props) {
  const [showAll, setShowAll] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="storefront-outline" size={24} color={colors.forest} />
        <Text style={styles.title} accessibilityRole="header">
          Épiceries près de toi
        </Text>
      </View>

      {!available ? (
        <Text style={styles.text}>La recherche d'épiceries passe par le serveur Mijoté : elle est disponible avec un compte connecté, pas en mode démonstration.</Text>
      ) : status === "loading" && !result ? (
        <View style={styles.center} accessibilityRole="progressbar" accessibilityLabel="Recherche des épiceries">
          <ActivityIndicator color={colors.forest} />
          <Text style={styles.text}>Recherche des épiceries…</Text>
        </View>
      ) : status === "error" ? (
        <View style={styles.gap}>
          <Text style={styles.error} accessibilityRole="alert">
            {storesErrorMessage(errorCode ?? "unreachable")}
          </Text>
          <SecondaryButton label="Réessayer" onPress={onRetry} />
        </View>
      ) : result && !result.supported ? (
        <Text style={styles.text}>La recherche d'épiceries couvre le Canada seulement. Change ton pays dans le profil pour l'utiliser.</Text>
      ) : result && result.placeUnavailable ? (
        <View style={styles.gap}>
          <Text style={styles.text}>Le service de lieux est indisponible pour le moment. Réessaie, ou choisis une ville toi-même.</Text>
          <SecondaryButton label="Réessayer" onPress={onRetry} />
          <PrimaryButton label="Choisir une ville" icon="location-outline" onPress={onChoosePlace} />
        </View>
      ) : result && result.needsPlace ? (
        <View style={styles.gap}>
          <Text style={styles.text}>Dis-nous où tu habites (ville ou code postal) pour trouver les épiceries autour de toi. Au Québec, la municipalité enregistrée dans tes préférences est utilisée automatiquement.</Text>
          <PrimaryButton label="Choisir ma ville" icon="location-outline" onPress={onChoosePlace} />
        </View>
      ) : result && result.place ? (
        <Results result={result} chosenPlace={chosenPlace} showAll={showAll} onToggle={() => setShowAll((value) => !value)} onChoosePlace={onChoosePlace} loading={status === "loading"} />
      ) : null}
    </View>
  );
}

function Results({ result, chosenPlace, showAll, onToggle, onChoosePlace, loading }: { result: NearbyStores; chosenPlace: boolean; showAll: boolean; onToggle: () => void; onChoosePlace: () => void; loading: boolean }) {
  const place = result.place!;
  const note = freshnessNote(result.freshness);
  const stores = showAll ? result.stores : result.stores.slice(0, VISIBLE_STORES);
  const province = place.provinceName;

  return (
    <View style={styles.gap}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Lieu : ${place.label}. Changer de lieu.`} onPress={onChoosePlace} style={styles.place} hitSlop={6}>
        <Ionicons name="location" size={18} color={colors.forest} />
        <Text style={styles.placeText} numberOfLines={2}>
          {place.label}
        </Text>
        <Text style={styles.change}>{chosenPlace ? "Changer" : "Modifier"}</Text>
      </Pressable>
      {loading ? <ActivityIndicator color={colors.forest} /> : null}
      {note ? (
        <View style={styles.note} accessibilityRole="alert">
          <Ionicons name="information-circle-outline" size={18} color={colors.forest} />
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}

      {result.stores.length > 0 ? (
        <>
          {radiusNote(result.radiusKm) ? <Text style={styles.small}>{radiusNote(result.radiusKm)}</Text> : null}
          {stores.map((store) => (
            <StoreRow key={store.id} store={store} />
          ))}
          {result.stores.length > VISIBLE_STORES ? (
            <Pressable accessibilityRole="button" onPress={onToggle} style={styles.more} hitSlop={6}>
              <Text style={styles.moreText}>{showAll ? "Voir moins" : `Voir les ${result.stores.length - VISIBLE_STORES} autres`}</Text>
            </Pressable>
          ) : null}
        </>
      ) : result.freshness !== "unavailable" ? (
        <Text style={styles.text}>Aucune épicerie répertoriée dans OpenStreetMap près de ce lieu. Essaie la ville voisine, ou consulte les bannières ci-dessous.</Text>
      ) : null}

      {result.chains.length > 0 ? (
        <View style={styles.gap}>
          <Text style={styles.sub}>{province ? `Bannières courantes · ${province}` : "Bannières courantes"}</Text>
          <View style={styles.wrap}>
            {result.chains.map((chain) => (
              <ChainChip key={chain.name} chain={chain} />
            ))}
          </View>
          <Text style={styles.small}>Liste indicative : confirme la présence d'un magasin précis sur le site de l'enseigne.</Text>
        </View>
      ) : null}

      <Text style={styles.small}>{result.attribution}</Text>
    </View>
  );
}

function StoreRow({ store }: { store: GroceryStore }) {
  const details = [kindLabel(store.kind), store.city].filter(Boolean).join(" · ");
  const content = (
    <>
      <View style={styles.storeIcon}>
        <Ionicons name={store.kind === "greengrocer" ? "nutrition-outline" : "basket-outline"} size={20} color={colors.forest} />
      </View>
      <View style={styles.storeInfo}>
        <Text style={styles.storeName} numberOfLines={2}>
          {store.name}
        </Text>
        <Text style={styles.small} numberOfLines={1}>
          {details}
        </Text>
        {store.address ? (
          <Text style={styles.small} numberOfLines={2}>
            {store.address}
          </Text>
        ) : null}
      </View>
      <View style={styles.storeSide}>
        <Text style={styles.distance}>{distanceLabel(store.distanceKm)}</Text>
        {store.website ? <Ionicons name="open-outline" size={16} color={colors.forest} /> : null}
      </View>
    </>
  );
  const label = `${store.name}. ${details}. ${store.address ?? ""} À ${distanceLabel(store.distanceKm)}.`;
  if (!store.website) return <View style={styles.store} accessibilityLabel={label}>{content}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label} Ouvrir le site.`} onPress={() => openWebsite(store.website)} style={({ pressed }) => [styles.store, pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  );
}

function ChainChip({ chain }: { chain: StoreChain }) {
  const body = (
    <>
      <Text style={styles.chipText}>{chain.name}</Text>
      {chain.website ? <Ionicons name="open-outline" size={13} color={colors.forest} /> : null}
    </>
  );
  const label = `${chain.name}, ${chainKindLabel(chain.kind)}`;
  if (!chain.website) return <View style={styles.chip} accessibilityLabel={label}>{body}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={`${label}. Ouvrir le site.`} onPress={() => openWebsite(chain.website)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.85 }]}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.card, padding: 18, gap: 12, ...softShadow },
  head: { flexDirection: "row", alignItems: "center", gap: 10 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 21, flex: 1 },
  gap: { gap: 10 },
  center: { alignItems: "center", gap: 8, paddingVertical: 12 },
  text: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  small: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 15, fontWeight: "600", lineHeight: 21 },
  place: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.pale, borderRadius: radius.input, paddingHorizontal: 12, minHeight: 44, paddingVertical: 6 },
  placeText: { flex: 1, color: colors.forest, fontSize: 15, fontWeight: "700" },
  change: { color: colors.forest, fontSize: 14, fontWeight: "700", textDecorationLine: "underline" },
  note: { flexDirection: "row", gap: 8, backgroundColor: colors.peach, borderRadius: 14, padding: 10, alignItems: "flex-start" },
  noteText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 18 },
  store: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.cream, borderRadius: radius.input, padding: 12 },
  storeIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  storeInfo: { flex: 1, gap: 1 },
  storeName: { color: colors.forest, fontSize: 16, fontWeight: "700" },
  storeSide: { alignItems: "flex-end", gap: 4 },
  distance: { color: colors.ink, fontSize: 14, fontWeight: "700" },
  more: { alignSelf: "center", minHeight: 44, justifyContent: "center" },
  moreText: { color: colors.forest, fontSize: 15, fontWeight: "700", textDecorationLine: "underline" },
  sub: { color: colors.muted, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.pale, borderRadius: radius.pill, paddingHorizontal: 12, minHeight: 36 },
  chipText: { color: colors.forest, fontSize: 14, fontWeight: "600" },
});
