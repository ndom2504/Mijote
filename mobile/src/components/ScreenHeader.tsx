import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radius, softShadow } from "../theme";

interface Props {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
}

/** En-tête des écrans secondaires : retour, titre en serif, action facultative. */
export function ScreenHeader({ title, onBack, right }: Props) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" onPress={onBack} style={styles.back} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.forest} />
        </Pressable>
      ) : null}
      <Text style={styles.title} accessibilityRole="header" numberOfLines={2}>
        {title}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  back: { width: 46, height: 46, borderRadius: radius.pill, backgroundColor: colors.white, alignItems: "center", justifyContent: "center", ...softShadow },
  title: { flex: 1, color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 28, lineHeight: 34 },
});
