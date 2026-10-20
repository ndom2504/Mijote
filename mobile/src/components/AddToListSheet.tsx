import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { listErrorMessage, progressLabel } from "../domain/lists";
import { SERVINGS_RANGE } from "../domain/options";
import type { Recipe } from "../domain/types";
import { usePersonal } from "../state/Personal";
import { colors, fonts, radius, shadow } from "../theme";
import { PrimaryButton } from "./Buttons";
import { Stepper } from "./PreferenceParts";

interface Props {
  recipe: Recipe | null;
  onClose: () => void;
}

/** Ajoute les ingrédients d'une recette à une liste d'épicerie, ramenés au nombre de portions voulu. */
export function AddToListSheet({ recipe, onClose }: Props) {
  const personal = usePersonal();
  const [servings, setServings] = useState(2);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (recipe) {
      setServings(personal.profile?.householdSize ?? recipe.servings);
      setMessage(null);
      setNewName("");
      setBusy(false);
    }
  }, [recipe, personal.profile?.householdSize]);

  const addTo = async (listId: string, listName: string) => {
    if (!recipe || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await personal.services.lists.addRecipe(listId, recipe, servings);
      personal.reloadLists();
      const parts = [`${result.added} ${result.added > 1 ? "articles ajoutés" : "article ajouté"}`];
      if (result.merged > 0) parts.push(`${result.merged} regroupé${result.merged > 1 ? "s" : ""} avec des articles existants`);
      setMessage({ ok: true, text: `${parts.join(", ")} dans « ${listName} ».` });
    } catch (caught) {
      setMessage({ ok: false, text: listErrorMessage(personal.report(caught)) });
    }
    setBusy(false);
  };

  const createAndAdd = async () => {
    if (busy) return;
    const created = await personal.createList(newName);
    if (!created.ok) {
      setMessage({ ok: false, text: created.message });
      return;
    }
    setNewName("");
    await addTo(created.id, newName.trim());
  };

  return (
    <Modal visible={recipe !== null} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.fill}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fermer" />
        <View style={styles.sheet} accessibilityViewIsModal>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              Ajouter à une liste
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} hitSlop={8} style={styles.close}>
              <Ionicons name="close" size={26} color={colors.forest} />
            </Pressable>
          </View>
          {recipe ? <Text style={styles.recipe} numberOfLines={2}>{recipe.name}</Text> : null}

          <Text style={styles.label}>Portions</Text>
          <Stepper label="Portions" value={servings} min={SERVINGS_RANGE.min} max={SERVINGS_RANGE.max} onChange={setServings} />

          {message ? (
            <View style={[styles.message, !message.ok && styles.messageError]} accessibilityRole="alert">
              <Ionicons name={message.ok ? "checkmark-circle" : "alert-circle"} size={20} color={message.ok ? colors.forest : colors.danger} />
              <Text style={styles.messageText}>{message.text}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Choisis une liste</Text>
          <ScrollView style={styles.lists} contentContainerStyle={{ gap: 8 }} keyboardShouldPersistTaps="handled">
            {personal.listsStatus === "loading" ? <ActivityIndicator color={colors.forest} /> : null}
            {personal.listsStatus === "error" ? <Text style={styles.muted}>Tes listes n'ont pas pu être chargées.</Text> : null}
            {personal.listsStatus === "ready" && personal.lists.length === 0 ? <Text style={styles.muted}>Tu n'as pas encore de liste. Crées-en une ci-dessous.</Text> : null}
            {personal.lists.map((list) => (
              <Pressable
                key={list.id}
                accessibilityRole="button"
                accessibilityLabel={`Ajouter à la liste ${list.name}`}
                disabled={busy}
                onPress={() => void addTo(list.id, list.name)}
                style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.85 }]}
              >
                <Ionicons name="cart-outline" size={22} color={colors.forest} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listName}>{list.name}</Text>
                  <Text style={styles.muted}>{progressLabel(list.itemCount, list.checkedCount)}</Text>
                </View>
                <Ionicons name="add-circle-outline" size={24} color={colors.forest} />
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Ou nouvelle liste</Text>
          <View style={styles.newRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              maxLength={60}
              placeholder="Nom de la liste"
              placeholderTextColor="#6B7F73"
              accessibilityLabel="Nom de la nouvelle liste"
              style={styles.input}
            />
          </View>
          <PrimaryButton label="Créer et ajouter" icon="add" disabled={busy || newName.trim().length === 0} onPress={() => void createAndAdd()} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(24,60,50,0.45)" },
  sheet: { backgroundColor: colors.cream, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: 20, gap: 10, maxHeight: "92%", ...shadow },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 24 },
  close: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  recipe: { color: colors.ink, fontSize: 16 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "800", marginTop: 4 },
  lists: { maxHeight: 190 },
  listRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.white, borderRadius: radius.input, borderWidth: 1, borderColor: colors.line, padding: 12, minHeight: 56 },
  listName: { color: colors.ink, fontSize: 16, fontWeight: "700" },
  muted: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  message: { flexDirection: "row", gap: 8, alignItems: "flex-start", backgroundColor: colors.pale, borderRadius: 14, padding: 12 },
  messageError: { backgroundColor: colors.dangerBg },
  messageText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 20 },
  newRow: { flexDirection: "row" },
  input: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, minHeight: 50, paddingHorizontal: 14, fontSize: 16, color: colors.ink },
});
