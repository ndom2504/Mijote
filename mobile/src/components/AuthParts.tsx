import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius } from "../theme";

/** Logo et signature, repris de l'accueil. */
export function AuthLogo({ size = 76 }: { size?: number }) {
  return (
    <View style={styles.logoWrap}>
      <Image
        source={require("../../assets/icon.png")}
        style={{ width: size, height: size, borderRadius: size * 0.26 }}
        accessibilityRole="image"
        accessibilityLabel="Mijoté"
      />
      <Text style={styles.tagline}>Bien manger, simplement.</Text>
    </View>
  );
}

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Retour"
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.back, pressed && styles.pressed]}
    >
      <Ionicons name="chevron-back" size={26} color={colors.forest} />
    </Pressable>
  );
}

/** Message d'erreur ou d'information, annoncé par les lecteurs d'écran. */
export function Notice({ text, tone = "error" }: { text: string; tone?: "error" | "info" }) {
  return (
    <View style={[styles.notice, tone === "error" ? styles.noticeError : styles.noticeInfo]} accessibilityRole="alert">
      <Ionicons
        name={tone === "error" ? "alert-circle-outline" : "information-circle-outline"}
        size={20}
        color={tone === "error" ? colors.danger : colors.forest}
      />
      <Text style={[styles.noticeText, { color: tone === "error" ? colors.danger : colors.forest }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  logoWrap: { alignItems: "center" },
  tagline: { color: colors.forest, fontFamily: fonts.serif, fontStyle: "italic", fontSize: 15, marginTop: 8 },
  back: { width: 48, height: 48, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", backgroundColor: colors.pale },
  pressed: { opacity: 0.8 },
  notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 14 },
  noticeError: { backgroundColor: colors.dangerBg },
  noticeInfo: { backgroundColor: colors.pale },
  noticeText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
