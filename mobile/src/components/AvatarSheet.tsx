import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "../theme";
import { PrimaryButton, SecondaryButton } from "./Buttons";
import type { AvatarSource } from "../lib/avatarPicker";

interface Props {
  visible: boolean;
  hasPhoto: boolean;
  busy: boolean;
  error: string | null;
  onPick: (source: AvatarSource) => void;
  onRemove: () => void;
  onClose: () => void;
}

/** Choix de la photo de profil : galerie, appareil photo (téléphone seulement) ou retrait. */
export function AvatarSheet({ visible, hasPhoto, busy, error, onPick, onRemove, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose} accessibilityLabel="Fermer">
        <Pressable style={styles.card} onPress={() => undefined} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            Photo de profil
          </Text>
          <Text style={styles.body}>Ta photo s'affiche en haut de l'accueil et dans ton profil. Elle est recadrée en carré et réduite avant l'envoi.</Text>
          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}
          <View style={styles.actions}>
            <PrimaryButton label={busy ? "Un instant…" : "Choisir dans la galerie"} icon="images-outline" disabled={busy} onPress={() => onPick("library")} />
            {Platform.OS !== "web" ? <PrimaryButton label="Prendre une photo" icon="camera-outline" disabled={busy} onPress={() => onPick("camera")} /> : null}
            {hasPhoto ? <SecondaryButton label="Retirer la photo" onPress={onRemove} disabled={busy} /> : null}
            <SecondaryButton label="Fermer" onPress={onClose} disabled={busy} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(24,60,50,0.45)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.cream, borderRadius: radius.card, padding: 24, gap: 10, ...shadow },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24 },
  body: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  error: { color: colors.danger, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  actions: { gap: 10, marginTop: 8 },
});
