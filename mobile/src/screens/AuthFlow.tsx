import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { authErrorMessage } from "../auth/messages";
import { BackButton } from "../components/AuthParts";
import { PrimaryButton } from "../components/Buttons";
import { Screen } from "../components/Screen";
import { ApiError, request } from "../data/client";
import { colors, fonts, radius } from "../theme";

interface Props {
  base: string;
  onAuthenticated: (token: string) => void;
  onBack: () => void;
}

/** Connexion, inscription et vérification du courriel (parcours existant, désormais secondaire). */
export function AuthFlow({ base, onAuthenticated, onBack }: Props) {
  const [step, setStep] = useState<"form" | "verify">("form");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");
  const [shownCode, setShownCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        const result = await request<{ token: string; verificationCode?: string | null }>(base, "/api/auth/register", {
          method: "POST",
          body: { email: email.trim(), password, confirm },
        });
        setToken(result.token);
        setShownCode(result.verificationCode || "");
        setStep("verify");
      } else {
        const result = await request<{ token: string; emailVerified: boolean }>(base, "/api/auth/login", {
          method: "POST",
          body: { email: email.trim(), password },
        });
        if (result.emailVerified) onAuthenticated(result.token);
        else {
          setToken(result.token);
          setStep("verify");
        }
      }
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : null;
      setError(authErrorMessage(failure ? failure.message : "unreachable", failure?.retryAfterSeconds));
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      await request(base, "/api/auth/verify", { method: "POST", token, body: { code } });
      if (token) onAuthenticated(token);
    } catch {
      setError("Ce code n'est pas valide.");
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError("");
    try {
      const sent = await request<{ code: string | null }>(base, "/api/auth/verify", { method: "POST", token, body: { resend: true } });
      setShownCode(sent.code || "");
    } catch {
      setError("Le code n'a pas pu être renvoyé.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <BackButton onPress={onBack} />
        <Text style={styles.brand}>Mijoté</Text>
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        {busy ? <ActivityIndicator color={colors.forest} /> : null}

        {step === "form" ? (
          <View>
            <Text style={styles.lead}>Connecte-toi avec ton courriel pour retrouver ta recette du jour.</Text>
            <Field label="Courriel" value={email} onChangeText={setEmail} keyboardType="email-address" />
            <Field label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
            {mode === "register" ? <Field label="Confirmer" value={confirm} onChangeText={setConfirm} secureTextEntry /> : null}
            <PrimaryButton
              label={mode === "register" ? "Créer mon compte" : "Me connecter"}
              icon="arrow-forward"
              onPress={() => void submit()}
              disabled={busy}
              style={styles.submit}
            />
            <Pressable accessibilityRole="button" onPress={() => setMode(mode === "register" ? "login" : "register")}>
              <Text style={styles.link}>{mode === "register" ? "J'ai déjà un compte" : "Créer un compte"}</Text>
            </Pressable>
          </View>
        ) : (
          <View>
            <Text style={styles.lead}>Entre le code de vérification. Si aucun courriel n'est envoyé, le code s'affiche ici.</Text>
            {shownCode ? <Text style={styles.code}>{shownCode}</Text> : null}
            <Field label="Code" value={code} onChangeText={setCode} keyboardType="number-pad" />
            <PrimaryButton label="Continuer" icon="arrow-forward" onPress={() => void verify()} disabled={busy} style={styles.submit} />
            <Pressable accessibilityRole="button" onPress={() => void resend()}>
              <Text style={styles.link}>Renvoyer le code</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Field({ label, ...props }: { label: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#6B7F73"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={label}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 24, paddingBottom: 48 },
  brand: { fontSize: 44, color: colors.forest, fontFamily: fonts.serif, fontStyle: "italic", marginTop: 16, marginBottom: 8 },
  lead: { color: colors.ink, fontSize: 17, lineHeight: 24, marginBottom: 16 },
  error: { backgroundColor: colors.dangerBg, color: colors.danger, padding: 12, borderRadius: 12, marginBottom: 12 },
  code: { fontSize: 32, letterSpacing: 6, color: colors.forest, textAlign: "center", marginVertical: 12 },
  field: { marginBottom: 12 },
  label: { color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.white,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 14,
    minHeight: 50,
    color: colors.ink,
    fontSize: 16,
  },
  submit: { marginTop: 14 },
  link: { color: colors.forest, textAlign: "center", marginTop: 18, fontSize: 16, fontWeight: "600" },
});
