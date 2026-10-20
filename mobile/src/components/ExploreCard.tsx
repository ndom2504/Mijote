import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, softShadow } from "../theme";

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  /** Grande icône décorative du panneau du haut. */
  art: keyof typeof Ionicons.glyphMap;
  tint: readonly [string, string];
  onPress: () => void;
}

/** Tuile « À découvrir » : panneau illustré par une icône (aucune photo externe non vérifiée), pastille ronde, titre. */
export function ExploreCard({ icon, title, art, tint, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient colors={[tint[0], tint[1]]} style={styles.art}>
        <Ionicons name={art} size={54} color="rgba(24,60,50,0.28)" />
      </LinearGradient>
      <View style={styles.badge}>
        <Ionicons name={icon} size={22} color={colors.cream} />
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, backgroundColor: colors.white, borderRadius: radius.tile, overflow: "hidden", minHeight: 150, ...softShadow },
  art: { height: 84, alignItems: "center", justifyContent: "center" },
  badge: {
    alignSelf: "center",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.forest,
    borderWidth: 3,
    borderColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: colors.forest, fontSize: 14, fontWeight: "700", textAlign: "center", paddingHorizontal: 6, paddingVertical: 8, lineHeight: 18 },
  pressed: { opacity: 0.85 },
});
