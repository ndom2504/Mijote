import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { authConfig } from "../../auth/config";
import { successCopy, type AuthVia } from "../../auth/flow";
import { PrimaryButton } from "../../components/Buttons";
import { FadeIn } from "../../components/FadeIn";
import { Screen } from "../../components/Screen";
import { colors, fonts } from "../../theme";

interface Props {
  isNewUser: boolean;
  via: AuthVia | null;
  /** Appelé une seule fois, automatiquement ou par le bouton : ouvre l'accueil. */
  onContinue: () => void;
}

/** Écran C : affiché seulement après une validation réelle par le serveur. */
export function AuthSuccessScreen({ isNewUser, via, onContinue }: Props) {
  const done = useRef(false);
  const scale = useRef(new Animated.Value(0.6)).current;
  const copy = successCopy(isNewUser, via);

  const finish = useRef(onContinue);
  finish.current = () => {
    if (done.current) return;
    done.current = true;
    onContinue();
  };

  useEffect(() => {
    Animated.spring(scale, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    const timer = setTimeout(() => finish.current(), authConfig.successDelayMs);
    return () => clearTimeout(timer);
  }, [scale]);

  return (
    <Screen>
      <View style={styles.content}>
        <Animated.View style={[styles.badge, { transform: [{ scale }] }]}>
          <Ionicons name="checkmark" size={56} color={colors.cream} />
        </Animated.View>
        <FadeIn delay={150}>
          <Text style={styles.title} accessibilityRole="header">{copy.title}</Text>
          <Text style={styles.text}>{copy.text}</Text>
        </FadeIn>
        <FadeIn delay={300} style={styles.action}>
          <PrimaryButton label="Continuer" icon="arrow-forward" onPress={() => finish.current()} />
        </FadeIn>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 24 },
  badge: { width: 112, height: 112, borderRadius: 56, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  title: { textAlign: "center", color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 30 },
  text: { textAlign: "center", color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 8 },
  action: { alignSelf: "stretch" },
});
