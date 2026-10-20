import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { sendPhoneCode } from "../../auth/authApi";
import { authConfig } from "../../auth/config";
import { authErrorMessage } from "../../auth/messages";
import { normalizePhone, phoneErrorMessage } from "../../auth/phone";
import { AuthLogo, BackButton, Notice } from "../../components/AuthParts";
import { PrimaryButton } from "../../components/Buttons";
import { DialCodeSheet } from "../../components/DialCodeSheet";
import { FadeIn } from "../../components/FadeIn";
import { Screen } from "../../components/Screen";
import { ApiError } from "../../data/client";
import { dialCountryByCode } from "../../data/dialCodes";
import { flagEmoji } from "../../lib/format";
import { colors, fonts, radius } from "../../theme";

export interface PhoneDraft {
  dialCountry: string;
  national: string;
}

interface Props {
  base: string;
  draft: PhoneDraft;
  onDraftChange: (draft: PhoneDraft) => void;
  onCodeSent: (phone: string, resendAt: number) => void;
  onBack: () => void;
}

/** Écran A : choix de l'indicatif, saisie du numéro, envoi du code. */
export function PhoneNumberScreen({ base, draft: initialDraft, onDraftChange, onCodeSent, onBack }: Props) {
  // État local pour l'affichage ; le parent garde une copie pour la retrouver en revenant du code.
  const [draft, setDraft] = useState<PhoneDraft>(initialDraft);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);
  const country = dialCountryByCode(draft.dialCountry);

  function change(next: Partial<PhoneDraft>) {
    setFieldError("");
    setServerError("");
    const updated = { ...draft, ...next };
    setDraft(updated);
    onDraftChange(updated);
  }

  async function submit() {
    if (busy) return;
    setServerError("");
    const parsed = normalizePhone(country.dial, draft.national);
    if (!parsed.ok) {
      setFieldError(draft.national.trim() ? phoneErrorMessage(parsed.error) : "Entre ton numéro de téléphone.");
      return;
    }
    setFieldError("");
    setBusy(true);
    try {
      const sent = await sendPhoneCode(base, parsed.e164);
      const seconds = sent.resendAfterSeconds > 0 ? sent.resendAfterSeconds : authConfig.defaultResendSeconds;
      onCodeSent(parsed.e164, Date.now() + seconds * 1000);
    } catch (caught) {
      const error = caught instanceof ApiError ? caught : null;
      setServerError(authErrorMessage(error ? error.message : "unreachable", error?.retryAfterSeconds));
      setBusy(false);
    }
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
            <Text style={styles.title} accessibilityRole="header">Ton numéro de téléphone</Text>
            <Text style={styles.lead}>Nous t'enverrons un code par SMS pour confirmer qu'il est bien à toi.</Text>
          </FadeIn>

          <FadeIn delay={200} style={styles.form}>
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Indicatif : ${country.name} ${country.dial}. Changer`}
                onPress={() => setSheetOpen(true)}
                style={({ pressed }) => [styles.dial, pressed && styles.pressed]}
              >
                <Text style={styles.flag}>{flagEmoji(country.code)}</Text>
                <Text style={styles.dialText}>{country.dial}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.forest} />
              </Pressable>
              <TextInput
                value={draft.national}
                onChangeText={(value) => change({ national: value.replace(/[^\d\s().\-]/g, "") })}
                placeholder={country.dial === "+1" ? "514 555 1234" : "Numéro de téléphone"}
                placeholderTextColor="#6B7F73"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoComplete="tel-national"
                autoCorrect={false}
                maxLength={20}
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                accessibilityLabel="Numéro de téléphone"
                style={[styles.input, !!fieldError && styles.inputError]}
              />
            </View>
            {fieldError ? <Text style={styles.fieldError} accessibilityRole="alert">{fieldError}</Text> : null}
            {serverError ? <Notice text={serverError} /> : null}

            <PrimaryButton label={busy ? "Envoi du code…" : "Recevoir mon code"} icon="chatbubble-outline" onPress={() => void submit()} disabled={busy} />

            <View style={styles.fees}>
              <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
              <Text style={styles.feesText}>Des frais de messages texte de ton opérateur peuvent s'appliquer.</Text>
            </View>
          </FadeIn>
        </ScrollView>
      </KeyboardAvoidingView>

      <DialCodeSheet
        visible={sheetOpen}
        selected={draft.dialCountry}
        onSelect={(code) => change({ dialCountry: code })}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 40, gap: 20 },
  logo: { alignItems: "center" },
  title: { textAlign: "center", color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 28 },
  lead: { textAlign: "center", color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 8 },
  form: { gap: 14 },
  row: { flexDirection: "row", gap: 10 },
  dial: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 54,
    paddingHorizontal: 12,
    borderRadius: radius.input,
    backgroundColor: colors.pale,
    borderWidth: 1,
    borderColor: colors.line,
  },
  flag: { fontSize: 22 },
  dialText: { color: colors.forest, fontSize: 17, fontWeight: "700" },
  input: {
    flex: 1,
    minHeight: 54,
    paddingHorizontal: 16,
    borderRadius: radius.input,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    color: colors.ink,
    fontSize: 18,
  },
  inputError: { borderColor: colors.danger },
  fieldError: { color: colors.danger, fontSize: 14, lineHeight: 20 },
  fees: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  feesText: { flex: 1, color: colors.muted, fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.85 },
});
