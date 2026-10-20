import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "../theme";
import { PrimaryButton, SecondaryButton } from "./Buttons";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Action destructrice ou sensible : bouton de confirmation rouge brique. */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation maison (fonctionne sur Android, iOS et web, contrairement à `Alert` sur le web). */
export function ConfirmSheet({ visible, title, message, confirmLabel, cancelLabel = "Annuler", danger, onConfirm, onCancel }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel} accessibilityLabel="Fermer">
        <Pressable style={styles.card} onPress={() => undefined} accessibilityViewIsModal>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
          <Text style={styles.body}>{message}</Text>
          <View style={styles.actions}>
            <PrimaryButton
              label={confirmLabel}
              icon="checkmark"
              onPress={onConfirm}
              style={danger ? { backgroundColor: colors.danger } : undefined}
            />
            <SecondaryButton label={cancelLabel} onPress={onCancel} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(24,60,50,0.45)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.cream, borderRadius: radius.card, padding: 24, gap: 12, ...shadow },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24, lineHeight: 30 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  actions: { gap: 10, marginTop: 8 },
});
