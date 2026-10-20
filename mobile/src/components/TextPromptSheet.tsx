import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, radius, shadow } from "../theme";
import { PrimaryButton, SecondaryButton } from "./Buttons";

interface Props {
  visible: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  maxLength?: number;
  /** Renvoie un message d'erreur à afficher, ou `null` si c'est réussi (la fenêtre se ferme alors). */
  onSubmit: (value: string) => Promise<string | null>;
  onClose: () => void;
}

/** Fenêtre de saisie d'un nom (création ou renommage d'une liste). */
export function TextPromptSheet({ visible, title, label, initialValue = "", confirmLabel, maxLength = 60, onSubmit, onClose }: Props) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
      setBusy(false);
    }
  }, [visible, initialValue]);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const message = await onSubmit(value);
    setBusy(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer">
          <Pressable style={styles.card} onPress={() => undefined} accessibilityViewIsModal>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              value={value}
              onChangeText={setValue}
              maxLength={maxLength}
              autoFocus
              accessibilityLabel={label}
              placeholderTextColor="#6B7F73"
              returnKeyType="done"
              onSubmitEditing={() => void submit()}
              style={styles.input}
            />
            {error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {error}
              </Text>
            ) : null}
            <View style={styles.actions}>
              <PrimaryButton label={busy ? "Un instant…" : confirmLabel} icon="checkmark" disabled={busy} onPress={() => void submit()} />
              <SecondaryButton label="Annuler" onPress={onClose} />
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(24,60,50,0.45)", justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.cream, borderRadius: radius.card, padding: 24, gap: 10, ...shadow },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24 },
  label: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.input,
    minHeight: 52,
    paddingHorizontal: 16,
    fontSize: 17,
    color: colors.ink,
  },
  error: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  actions: { gap: 10, marginTop: 8 },
});
