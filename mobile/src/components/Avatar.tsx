import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, fonts } from "../theme";

interface Props {
  /** Photo de profil (adresse `data:` ou https) ; sans elle, les initiales s'affichent. */
  uri: string | null;
  initials: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}

/** Pastille ronde : photo de profil, sinon initiales, sinon icône de personne. */
export function Avatar({ uri, initials, size, style }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const round = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.base, round, style]}>
      {uri && !failed ? (
        <Image source={{ uri }} style={round} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      ) : initials ? (
        <Text style={[styles.initials, { fontSize: Math.round(size * 0.37) }]}>{initials}</Text>
      ) : (
        <Ionicons name="person" size={Math.round(size * 0.5)} color={colors.forest} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.pale, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700" },
});
