import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { fetchProviders, loginWithGoogleToken, type ProvidersStatus } from "../../auth/authApi";
import { googleSignIn } from "../../auth/googleNative";
import { googleErrorMessage } from "../../auth/googleSignIn";
import { authErrorMessage, googleUnavailableMessage } from "../../auth/messages";
import { AuthLogo, Notice } from "../../components/AuthParts";
import { FadeIn } from "../../components/FadeIn";
import { RecipePhoto } from "../../components/RecipePhoto";
import { Screen } from "../../components/Screen";
import { ApiError } from "../../data/client";
import { colors, fonts, radius, softShadow } from "../../theme";

const HERO = "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=80";

interface Props {
  base: string;
  onSignedIn: (token: string, isNewUser: boolean) => void;
  onChoosePhone: () => void;
  onChooseEmail: () => void;
  /** Fourni uniquement en développement : ouvre l'application avec les données de démonstration. */
  onDemo?: () => void;
}

type NoticeState = { text: string; tone: "error" | "info" } | null;

export function WelcomeScreen({ base, onSignedIn, onChoosePhone, onChooseEmail, onDemo }: Props) {
  const [providers, setProviders] = useState<ProvidersStatus | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);

  // Le serveur dit honnêtement ce qui est configuré ; en cas d'échec, on laisse l'utilisateur essayer.
  useEffect(() => {
    let cancelled = false;
    fetchProviders(base)
      .then((status) => !cancelled && setProviders(status))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [base]);

  async function google() {
    if (googleBusy) return;
    setNotice(null);
    if (providers && !providers.google) {
      setNotice({ text: authErrorMessage("google_unavailable"), tone: "info" });
      return;
    }
    setGoogleBusy(true);
    try {
      const result = await googleSignIn();
      if (result.status === "cancelled") {
        setNotice({ text: "Connexion Google annulée.", tone: "info" });
      } else if (result.status === "unavailable") {
        setNotice({ text: googleUnavailableMessage(result.reason), tone: "info" });
      } else if (result.status === "error") {
        setNotice({ text: googleErrorMessage(result.reason), tone: "error" });
      } else {
        const login = await loginWithGoogleToken(base, result.idToken);
        onSignedIn(login.token, login.isNewUser);
        return;
      }
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null;
      setNotice({ text: authErrorMessage(error ? error.message : "unreachable", error?.retryAfterSeconds), tone: "error" });
    }
    setGoogleBusy(false);
  }

  function phone() {
    setNotice(null);
    if (providers && !providers.phone) {
      setNotice({ text: authErrorMessage("phone_unavailable"), tone: "info" });
      return;
    }
    onChoosePhone();
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <FadeIn>
          <AuthLogo />
        </FadeIn>

        <FadeIn delay={120} style={styles.heroWrap}>
          <RecipePhoto uri={HERO} style={styles.hero} />
        </FadeIn>

        <FadeIn delay={220}>
          <Text style={styles.title} accessibilityRole="header">Bienvenue chez Mijoté</Text>
          <Text style={styles.lead}>Connecte-toi pour découvrir des recettes à ton goût.</Text>
        </FadeIn>

        <FadeIn delay={320} style={styles.actions}>
          {notice ? <Notice text={notice.text} tone={notice.tone} /> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuer avec Google"
            accessibilityState={{ disabled: googleBusy, busy: googleBusy }}
            disabled={googleBusy}
            onPress={() => void google()}
            style={({ pressed }) => [styles.google, pressed && styles.pressed, googleBusy && styles.disabled]}
          >
            {googleBusy ? <ActivityIndicator color={colors.forest} /> : <Ionicons name="logo-google" size={22} color="#4285F4" />}
            <Text style={styles.googleText}>Continuer avec Google</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continuer avec mon téléphone"
            disabled={googleBusy}
            onPress={phone}
            style={({ pressed }) => [styles.phone, pressed && styles.pressed, googleBusy && styles.disabled]}
          >
            <Ionicons name="phone-portrait-outline" size={22} color={colors.cream} />
            <Text style={styles.phoneText}>Continuer avec mon téléphone</Text>
          </Pressable>

          <Pressable accessibilityRole="button" onPress={onChooseEmail} disabled={googleBusy} hitSlop={6}>
            <Text style={styles.link}>Déjà un compte ? Connecte-toi</Text>
          </Pressable>
        </FadeIn>

        <FadeIn delay={420}>
          <Text style={styles.legal}>
            En continuant, tu acceptes nos{" "}
            <Text style={styles.legalLink} accessibilityRole="link" onPress={() => void Linking.openURL(`${base}/conditions`)}>
              conditions d'utilisation
            </Text>{" "}
            et notre{" "}
            <Text style={styles.legalLink} accessibilityRole="link" onPress={() => void Linking.openURL(`${base}/confidentialite`)}>
              politique de confidentialité
            </Text>
            .
          </Text>
          {onDemo ? (
            <Pressable accessibilityRole="button" onPress={onDemo} hitSlop={6}>
              <Text style={styles.demo}>Développement : voir la démonstration</Text>
            </Pressable>
          ) : null}
        </FadeIn>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40, gap: 20 },
  heroWrap: { borderRadius: radius.card, overflow: "hidden", ...softShadow },
  hero: { height: 190, width: "100%", borderRadius: radius.card, overflow: "hidden" },
  title: { textAlign: "center", color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 30 },
  lead: { textAlign: "center", color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 8 },
  actions: { gap: 14 },
  google: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
    ...softShadow,
  },
  googleText: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  phone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.forest,
  },
  phoneText: { color: colors.cream, fontSize: 17, fontWeight: "700" },
  link: { color: colors.forest, textAlign: "center", fontSize: 16, fontWeight: "600", paddingVertical: 8 },
  legal: { textAlign: "center", color: colors.muted, fontSize: 13, lineHeight: 20 },
  legalLink: { color: colors.forest, fontWeight: "700", textDecorationLine: "underline" },
  demo: { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 14, textDecorationLine: "underline" },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
});
