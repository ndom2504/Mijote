import { Ionicons } from "@expo/vector-icons";
import { useState, type ReactNode } from "react";
import { ImageBackground, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors } from "../theme";

interface Props {
  uri: string | null;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}

/** Photo de recette avec repli élégant lorsque l'image manque ou ne charge pas. */
export function RecipePhoto({ uri, style, children }: Props) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={[styles.fallback, style]}>
        <Ionicons name="restaurant-outline" size={44} color={colors.sage} />
        {children}
      </View>
    );
  }
  return (
    <ImageBackground source={{ uri }} style={style} resizeMode="cover" onError={() => setFailed(true)}>
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  fallback: { backgroundColor: colors.pale, alignItems: "center", justifyContent: "center" },
});
