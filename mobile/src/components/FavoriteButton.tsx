import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet } from "react-native";
import { colors, radius } from "../theme";

interface Props {
  active: boolean;
  onPress: () => void;
  recipeName: string;
}

export function FavoriteButton({ active, onPress, recipeName }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? `Retirer ${recipeName} des favoris` : `Ajouter ${recipeName} aux favoris`}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Ionicons name={active ? "heart" : "heart-outline"} size={24} color={active ? colors.heart : colors.forest} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.8 },
});
