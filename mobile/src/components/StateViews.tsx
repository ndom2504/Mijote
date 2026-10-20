import { Ionicons } from "@expo/vector-icons";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, softShadow } from "../theme";
import { PrimaryButton, SecondaryButton } from "./Buttons";

export function ProvisionalBadge() {
  return (
    <View style={styles.badge} accessibilityLabel="Écran provisoire">
      <Ionicons name="construct-outline" size={14} color={colors.forest} />
      <Text style={styles.badgeText}>Écran provisoire</Text>
    </View>
  );
}

export function DemoBanner() {
  return (
    <View style={styles.demo} accessibilityRole="alert">
      <Ionicons name="flask-outline" size={18} color={colors.forest} />
      <Text style={styles.demoText}>Mode démonstration : recettes d'exemple et données gardées sur cet appareil, rien n'est enregistré sur un compte.</Text>
    </View>
  );
}

export function LoadingCard({ label = "Préparation de ta recette…" }: { label?: string }) {
  return (
    <View style={[styles.card, styles.loading]} accessibilityRole="progressbar" accessibilityLabel={label}>
      <ActivityIndicator size="large" color={colors.forest} />
      <Text style={styles.cardText}>{label}</Text>
    </View>
  );
}

interface ErrorProps {
  message: string;
  onRetry: () => void;
  onDemo?: () => void;
  title?: string;
}

export function ErrorCard({ message, onRetry, onDemo, title = "Oups, la recette n'a pas chargé" }: ErrorProps) {
  return (
    <View style={[styles.card, styles.error]} accessibilityRole="alert">
      <Ionicons name="cloud-offline-outline" size={36} color={colors.danger} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{message}</Text>
      <PrimaryButton label="Réessayer" icon="refresh" onPress={onRetry} />
      {onDemo ? <SecondaryButton label="Voir la démonstration" onPress={onDemo} /> : null}
    </View>
  );
}

export function EmptyCard({ title, message }: { title: string; message: string }) {
  return (
    <View style={styles.card}>
      <Ionicons name="leaf-outline" size={36} color={colors.sage} />
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.card,
    padding: 24,
    alignItems: "center",
    gap: 12,
    ...softShadow,
  },
  loading: { minHeight: 300, justifyContent: "center" },
  error: { backgroundColor: colors.dangerBg },
  cardTitle: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 22, textAlign: "center" },
  cardText: { color: colors.ink, fontSize: 16, lineHeight: 23, textAlign: "center" },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pale,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    minHeight: 30,
  },
  badgeText: { color: colors.forest, fontSize: 13, fontWeight: "700" },
  demo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.peach,
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
  },
  demoText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 19 },
});
