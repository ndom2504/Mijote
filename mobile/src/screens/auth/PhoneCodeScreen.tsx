import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput } from "react-native";
import { sendPhoneCode, verifyPhoneCode } from "../../auth/authApi";
import { authConfig } from "../../auth/config";
import { formatCountdown, secondsRemaining } from "../../auth/flow";
import { authErrorMessage } from "../../auth/messages";
import { maskPhone } from "../../auth/phone";
import { AuthLogo, BackButton, Notice } from "../../components/AuthParts";
import { PrimaryButton } from "../../components/Buttons";
import { FadeIn } from "../../components/FadeIn";
import { Screen } from "../../components/Screen";
import { ApiError } from "../../data/client";
import { colors, fonts, radius } from "../../theme";

interface Props {
  base: string;
  phone: string;
  resendAt: number | null;
  onResendScheduled: (resendAt: number) => void;
  onVerified: (token: string, isNewUser: boolean) => void;
  onChangeNumber: () => void;
  onBack: () => void;
}

/** Écran B : saisie du code à six chiffres, renvoi différé, modification du numéro. */
export function PhoneCodeScreen({ base, phone, resendAt, onResendScheduled, onVerified, onChangeNumber, onBack }: Props) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const wait = secondsRemaining(resendAt, now);
  useEffect(() => {
    if (wait <= 0) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [wait]);

  const complete = code.length === authConfig.codeLength;

  async function verify() {
    if (verifying || !complete) return;
    setError("");
    setInfo("");
    setVerifying(true);
    try {
      const result = await verifyPhoneCode(base, phone, code);
      onVerified(result.token, result.isNewUser);
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : null;
      const kind = failure ? failure.message : "unreachable";
      setError(authErrorMessage(kind, failure?.retryAfterSeconds));
      if (kind === "invalid_code" || kind === "expired") setCode("");
      setVerifying(false);
    }
  }

  async function resend() {
    if (resending || wait > 0) return;
    setError("");
    setInfo("");
    setResending(true);
    try {
      const sent = await sendPhoneCode(base, phone);
      const seconds = sent.resendAfterSeconds > 0 ? sent.resendAfterSeconds : authConfig.defaultResendSeconds;
      setNow(Date.now());
      onResendScheduled(Date.now() + seconds * 1000);
      setCode("");
      setInfo("Un nouveau code vient d'être envoyé.");
    } catch (caught) {
      const failure = caught instanceof ApiError ? caught : null;
      if (failure?.message === "rate_limited" && failure.retryAfterSeconds) {
        setNow(Date.now());
        onResendScheduled(Date.now() + failure.retryAfterSeconds * 1000);
      }
      setError(authErrorMessage(failure ? failure.message : "unreachable", failure?.retryAfterSeconds));
    }
    setResending(false);
  }

  return (
    <Screen>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <BackButton onPress={onBack} />
          <FadeIn style={styles.logo}>
            <AuthLogo size={64} />
          </FadeIn>

          <FadeIn delay={100}>
            <Text style={styles.title} accessibilityRole="header">Entre ton code</Text>
            <Text style={styles.lead}>
              Nous avons envoyé un code à six chiffres au <Text style={styles.phone}>{maskPhone(phone)}</Text>.
            </Text>
          </FadeIn>

          <FadeIn delay={200} style={styles.form}>
            <TextInput
              value={code}
              onChangeText={(value) => {
                setError("");
                setCode(value.replace(/\D/g, "").slice(0, authConfig.codeLength));
              }}
              placeholder="••••••"
              placeholderTextColor="#9AB0A0"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              autoCorrect={false}
              maxLength={authConfig.codeLength}
              autoFocus
              onSubmitEditing={() => void verify()}
              accessibilityLabel="Code de vérification à six chiffres"
              style={[styles.code, !!error && styles.codeError]}
            />
            {error ? <Notice text={error} /> : null}
            {info && !error ? <Notice text={info} tone="info" /> : null}

            <PrimaryButton
              label={verifying ? "Vérification…" : "Vérifier mon code"}
              icon="checkmark"
              onPress={() => void verify()}
              disabled={verifying || !complete}
            />

            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: wait > 0 || resending }}
              disabled={wait > 0 || resending || verifying}
              onPress={() => void resend()}
              hitSlop={6}
            >
              <Text style={[styles.link, (wait > 0 || resending) && styles.linkOff]}>
                {wait > 0 ? `Renvoyer le code dans ${formatCountdown(wait)}` : resending ? "Envoi…" : "Renvoyer le code"}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={onChangeNumber} disabled={verifying} hitSlop={6}>
              <Text style={styles.link}>Modifier le numéro</Text>
            </Pressable>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 20 },
  logo: { alignItems: "center" },
  title: { textAlign: "center", color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 28 },
  lead: { textAlign: "center", color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 8 },
  phone: { color: colors.forest, fontWeight: "700" },
  form: { gap: 14 },
  code: {
    minHeight: 64,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.forest,
    textAlign: "center",
    fontSize: 30,
    letterSpacing: 10,
    fontWeight: "700",
  },
  codeError: { borderColor: colors.danger },
  link: { color: colors.forest, textAlign: "center", fontSize: 16, fontWeight: "600", paddingVertical: 8 },
  linkOff: { color: colors.muted, fontWeight: "400" },
});
