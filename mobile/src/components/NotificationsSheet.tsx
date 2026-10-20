import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, shadow } from "../theme";
import { PrimaryButton } from "./Buttons";
import { ProvisionalBadge } from "./StateViews";

export function NotificationsSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer les notifications">
        <Pressable style={styles.card} onPress={() => undefined}>
          <ProvisionalBadge />
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.body}>Aucun rappel pour le moment. Les rappels de repas arriveront à une prochaine étape.</Text>
          <View style={styles.actions}>
            <PrimaryButton label="Fermer" icon="close" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(24,60,50,0.45)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.cream, borderRadius: radius.card, padding: 24, gap: 12, ...shadow },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 26 },
  body: { color: colors.ink, fontSize: 16, lineHeight: 23 },
  actions: { marginTop: 8 },
});
