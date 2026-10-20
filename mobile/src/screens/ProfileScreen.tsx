import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { initialsOf } from "../components/BrandHeader";
import { SecondaryButton } from "../components/Buttons";
import { CountrySheet } from "../components/CountryPicker";
import { NotificationsSheet } from "../components/NotificationsSheet";
import { Screen } from "../components/Screen";
import { flagEmoji } from "../lib/format";
import { useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors, fonts, radius, softShadow } from "../theme";

interface RowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  hint?: string;
  onPress?: () => void;
}

function Row({ icon, label, value, hint, onPress }: RowProps) {
  const content = (
    <>
      <Ionicons name={icon} size={24} color={colors.forest} />
      <View style={styles.cardText}>
        <Text style={styles.label}>{label}</Text>
        {value ? <Text style={styles.value}>{value}</Text> : null}
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={20} color={colors.forest} /> : null}
    </>
  );
  if (!onPress) return <View style={styles.card}>{content}</View>;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      {content}
    </Pressable>
  );
}

export function ProfileScreen() {
  const data = useAppData();
  const personal = usePersonal();
  const { openPreferences, openSaved } = useNav();
  const [countryOpen, setCountryOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { breakfastFrom, lunchFrom, dinnerFrom } = data.windows;
  const profile = personal.profile;
  const initials = initialsOf(profile?.firstName);

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Profil
        </Text>

        <View style={styles.identity}>
          <View style={styles.avatar}>{initials ? <Text style={styles.initials}>{initials}</Text> : <Ionicons name="person" size={30} color={colors.forest} />}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{profile?.firstName || "Bienvenue"}</Text>
            <Text style={styles.hint}>{data.source === "demo" ? "Mode démonstration" : "Compte Mijoté connecté"}</Text>
          </View>
        </View>

        <Row icon="options-outline" label="Mes préférences alimentaires" hint="Allergies, régime, ingrédients à éviter, portions et temps" onPress={openPreferences} />
        <Row icon="bookmark-outline" label="Recettes sauvegardées" value={personal.stats.saved === null ? undefined : String(personal.stats.saved)} onPress={openSaved} />
        <Row
          icon="location"
          label="Pays"
          value={data.country ? `${flagEmoji(data.country.code)} ${data.country.name}`.trim() : "Non défini"}
          onPress={() => setCountryOpen(true)}
        />
        <Row icon="notifications-outline" label="Notifications" hint="Les rappels de repas arriveront à une prochaine étape." onPress={() => setNotificationsOpen(true)} />
        <Row
          icon="time-outline"
          label="Plages des repas"
          value={`Déjeuner dès ${breakfastFrom} h · Dîner dès ${lunchFrom} h · Souper dès ${dinnerFrom} h`}
          hint="Valeurs par défaut, pas encore modifiables."
        />
        <Row
          icon={data.source === "demo" ? "flask-outline" : "cloud-done-outline"}
          label="Données"
          value={data.source === "demo" ? "Démonstration (exemples en mémoire)" : "Catalogue et compte Mijoté"}
        />

        <SecondaryButton label={data.source === "demo" ? "Quitter la démonstration" : "Se déconnecter"} onPress={data.logout} />
      </ScrollView>

      <CountrySheet visible={countryOpen} selected={data.country?.code ?? null} onSelect={(code) => void data.changeCountry(code)} onClose={() => setCountryOpen(false)} />
      <NotificationsSheet visible={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 32 },
  identity: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 4 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24 },
  name: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, borderRadius: radius.tile, padding: 16, ...softShadow },
  cardText: { flex: 1, gap: 2 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  value: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
