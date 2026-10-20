import { Ionicons } from "@expo/vector-icons";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, softShadow } from "../theme";
import { Avatar } from "./Avatar";

interface Props {
  /** Initiales du prénom ; icône de personne si le prénom est inconnu. */
  initials: string;
  /** Photo de profil, si la personne en a téléversé une. */
  photoUri?: string | null;
  onPressProfile: () => void;
}

/** Logo, signature et avatar (avec roue d'engrenage) qui mène au profil et aux paramètres. */
export function BrandHeader({ initials, photoUri = null, onPressProfile }: Props) {
  return (
    <View>
      <View style={styles.logoRow}>
        <Image source={require("../../assets/icon.png")} style={styles.logo} accessibilityRole="image" accessibilityLabel="Mijoté" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profil et paramètres"
          onPress={onPressProfile}
          style={({ pressed }) => [styles.avatarWrap, pressed && styles.pressed]}
          hitSlop={6}
        >
          <Avatar uri={photoUri} initials={initials} size={54} style={styles.avatar} />
          <View style={styles.gear}>
            <Ionicons name="settings" size={13} color={colors.cream} />
          </View>
        </Pressable>
      </View>
      <Text style={styles.tagline}>Bien manger, simplement.</Text>
    </View>
  );
}

/** Initiales (1 ou 2 lettres) à partir du prénom. */
export function initialsOf(firstName: string | null | undefined): string {
  const parts = (firstName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  return parts
    .slice(0, 2)
    .map((part) => part[0]!.toLocaleUpperCase("fr"))
    .join("");
}

const styles = StyleSheet.create({
  logoRow: { alignItems: "center", justifyContent: "center", minHeight: 80, marginTop: 8 },
  logo: { width: 76, height: 76, borderRadius: 20 },
  avatarWrap: { position: "absolute", right: 0, top: 6, width: 58, height: 58 },
  avatar: { borderWidth: 2, borderColor: colors.white, ...softShadow },
  gear: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.forest,
    borderWidth: 2,
    borderColor: colors.cream,
    alignItems: "center",
    justifyContent: "center",
  },
  tagline: { textAlign: "center", color: colors.forest, fontFamily: fonts.serif, fontStyle: "italic", fontSize: 15, marginTop: 8 },
  pressed: { opacity: 0.8 },
});
