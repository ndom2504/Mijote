import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Avatar } from "../components/Avatar";
import { AvatarSheet } from "../components/AvatarSheet";
import { initialsOf } from "../components/BrandHeader";
import { SecondaryButton } from "../components/Buttons";
import { CountrySheet } from "../components/CountryPicker";
import { NotificationsSheet } from "../components/NotificationsSheet";
import { Screen } from "../components/Screen";
import { CAMERA_DENIED_MESSAGE, PICK_FAILED_MESSAGE } from "../domain/avatar";
import { pickAvatar, type AvatarSource } from "../lib/avatarPicker";
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
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoNotice, setPhotoNotice] = useState<string | null>(null);

  const choosePhoto = async (source: AvatarSource) => {
    setPhotoError(null);
    setPhotoBusy(true);
    const picked = await pickAvatar(source);
    if (picked.status === "denied") setPhotoError(CAMERA_DENIED_MESSAGE);
    else if (picked.status === "error") setPhotoError(PICK_FAILED_MESSAGE);
    else if (picked.status === "ok") {
      const saved = await personal.setAvatar(picked.base64);
      if (saved.ok) {
        setPhotoOpen(false);
        setPhotoNotice("Photo de profil mise à jour.");
      } else setPhotoError(saved.message);
    }
    setPhotoBusy(false);
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    const removed = await personal.removeAvatar();
    setPhotoBusy(false);
    if (removed.ok) {
      setPhotoOpen(false);
      setPhotoNotice("Photo de profil retirée.");
    } else setPhotoError(removed.message);
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title} accessibilityRole="header">
          Profil
        </Text>

        <View style={styles.identity}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={personal.avatarUri ? "Changer ma photo de profil" : "Ajouter une photo de profil"}
            onPress={() => {
              setPhotoError(null);
              setPhotoOpen(true);
            }}
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}
          >
            <Avatar uri={personal.avatarUri} initials={initials} size={84} />
            <View style={styles.camera}>
              <Ionicons name="camera" size={15} color={colors.cream} />
            </View>
          </Pressable>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{profile?.firstName || "Bienvenue"}</Text>
            <Text style={styles.hint}>{data.source === "demo" ? "Mode démonstration" : "Compte Mijoté connecté"}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={personal.avatarUri ? "Changer la photo" : "Ajouter une photo"}
              onPress={() => {
                setPhotoError(null);
                setPhotoOpen(true);
              }}
              hitSlop={8}
            >
              <Text style={styles.link}>{personal.avatarUri ? "Changer la photo" : "Ajouter une photo"}</Text>
            </Pressable>
          </View>
        </View>
        {photoNotice ? (
          <Text style={styles.notice} accessibilityRole="alert">
            {photoNotice}
          </Text>
        ) : null}

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
      <AvatarSheet
        visible={photoOpen}
        hasPhoto={personal.avatarUri !== null}
        busy={photoBusy}
        error={photoError}
        onPick={(source) => void choosePhoto(source)}
        onRemove={() => void removePhoto()}
        onClose={() => setPhotoOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 14, paddingBottom: 32 },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 32 },
  identity: { flexDirection: "row", alignItems: "center", gap: 16, marginBottom: 4 },
  avatarWrap: { width: 84, height: 84 },
  camera: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.forest,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  link: { color: colors.forest, fontSize: 15, fontWeight: "700", textDecorationLine: "underline" },
  notice: { color: colors.forest, backgroundColor: colors.pale, borderRadius: 14, padding: 12, fontSize: 14, fontWeight: "600" },
  name: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24 },
  card: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: colors.white, borderRadius: radius.tile, padding: 16, ...softShadow },
  cardText: { flex: 1, gap: 2 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  value: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  hint: { color: colors.muted, fontSize: 13, lineHeight: 18 },
});
