import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { EmptyCard, ErrorCard, LoadingCard } from "../components/StateViews";
import { TextPromptSheet } from "../components/TextPromptSheet";
import { itemQuantity, listErrorMessage, progressLabel } from "../domain/lists";
import type { ShoppingListDetail } from "../domain/types";
import { loadErrorMessage } from "../lib/errors";
import { useNav } from "../navigation/NavContext";
import { usePersonal } from "../state/Personal";
import { colors, radius, softShadow } from "../theme";

export function ListDetailScreen({ id, title }: { id: string; title: string }) {
  const { back, retitleList } = useNav();
  const personal = usePersonal();
  const lists = personal.services.lists;
  const [list, setList] = useState<ShoppingListDetail | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "gone">("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [newItem, setNewItem] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      setList(await lists.detail(id));
      setStatus("ready");
    } catch (caught) {
      const code = personal.report(caught);
      setErrorCode(code);
      setStatus(code === "not_found" ? "gone" : "error");
    }
  }, [lists, id, personal]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (action: () => Promise<void>, optimistic?: (current: ShoppingListDetail) => ShoppingListDetail) => {
    const previous = list;
    if (optimistic && list) setList(optimistic(list));
    setMessage(null);
    try {
      await action();
      personal.reloadLists();
    } catch (caught) {
      setMessage(listErrorMessage(personal.report(caught)));
      if (previous) setList(previous);
    }
  };

  const addItem = async () => {
    const name = newItem.trim();
    if (name.length < 2) {
      setMessage("Écris au moins 2 lettres pour l'article.");
      return;
    }
    setMessage(null);
    try {
      await lists.addItem(id, { name, quantity: null, unit: null });
      setNewItem("");
      setList(await lists.detail(id));
      personal.reloadLists();
    } catch (caught) {
      setMessage(listErrorMessage(personal.report(caught)));
    }
  };

  const items = list?.items ?? [];
  const checked = items.filter((item) => item.checked).length;

  return (
    <Screen>
      <ScreenHeader
        title={list?.name ?? title}
        onBack={back}
        right={
          list ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Renommer la liste" onPress={() => setRenaming(true)} hitSlop={8} style={styles.iconButton}>
              <Ionicons name="create-outline" size={22} color={colors.forest} />
            </Pressable>
          ) : null
        }
      />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {status === "loading" && !list ? <LoadingCard label="Chargement de la liste…" /> : null}
        {status === "error" ? <ErrorCard title="Oups, la liste n'a pas chargé" message={loadErrorMessage(errorCode, "la liste")} onRetry={() => void load()} /> : null}
        {status === "gone" ? <EmptyCard title="Cette liste n'existe plus" message="Elle a peut-être été supprimée depuis un autre appareil." /> : null}

        {list ? (
          <>
            <Text style={styles.progress}>{progressLabel(items.length, checked)}</Text>

            <View style={styles.addRow}>
              <TextInput
                value={newItem}
                onChangeText={(text) => {
                  setNewItem(text);
                  setMessage(null);
                }}
                onSubmitEditing={() => void addItem()}
                returnKeyType="done"
                maxLength={80}
                placeholder="Ajouter un article"
                placeholderTextColor="#6B7F73"
                accessibilityLabel="Ajouter un article"
                style={styles.input}
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Ajouter l'article" onPress={() => void addItem()} style={styles.addButton}>
                <Ionicons name="add" size={26} color={colors.cream} />
              </Pressable>
            </View>
            {message ? (
              <Text style={styles.error} accessibilityRole="alert">
                {message}
              </Text>
            ) : null}

            {items.length === 0 ? <EmptyCard title="Liste vide" message="Ajoute un article ci-dessus, ou les ingrédients d'une recette depuis sa fiche." /> : null}

            {items.map((item) => (
              <View key={item.id} style={styles.item}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={`${item.name}${itemQuantity(item) ? `, ${itemQuantity(item)}` : ""}`}
                  onPress={() =>
                    void run(
                      () => lists.setChecked(id, item.id, !item.checked),
                      (current) => ({ ...current, items: current.items.map((entry) => (entry.id === item.id ? { ...entry, checked: !entry.checked } : entry)) }),
                    )
                  }
                  style={styles.itemMain}
                >
                  <View style={[styles.box, item.checked && styles.boxOn]}>{item.checked ? <Ionicons name="checkmark" size={18} color={colors.cream} /> : null}</View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, item.checked && styles.itemDone]}>{item.name}</Text>
                    {itemQuantity(item) ? <Text style={styles.itemMeta}>{itemQuantity(item)}</Text> : null}
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Retirer ${item.name}`}
                  hitSlop={8}
                  onPress={() => void run(() => lists.removeItem(id, item.id), (current) => ({ ...current, items: current.items.filter((entry) => entry.id !== item.id) }))}
                  style={styles.iconButton}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}

            {checked > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void run(() => lists.clearChecked(id), (current) => ({ ...current, items: current.items.filter((entry) => !entry.checked) }))}
                style={styles.textButton}
              >
                <Ionicons name="checkmark-done-outline" size={20} color={colors.forest} />
                <Text style={styles.textButtonLabel}>Retirer les articles cochés</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={() => setDeleting(true)} style={styles.textButton}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
              <Text style={[styles.textButtonLabel, { color: colors.danger }]}>Supprimer la liste</Text>
            </Pressable>
          </>
        ) : null}
      </ScrollView>

      <TextPromptSheet
        visible={renaming}
        title="Renommer la liste"
        label="Nom de la liste"
        initialValue={list?.name ?? title}
        confirmLabel="Renommer"
        onClose={() => setRenaming(false)}
        onSubmit={async (name) => {
          const result = await personal.renameList(id, name);
          if (!result.ok) return result.message;
          setList((current) => (current ? { ...current, name: name.replace(/\s+/g, " ").trim() } : current));
          retitleList(name.replace(/\s+/g, " ").trim());
          return null;
        }}
      />
      <ConfirmSheet
        visible={deleting}
        danger
        title="Supprimer cette liste ?"
        message={`« ${list?.name ?? title} » et ses articles seront supprimés pour de bon.`}
        confirmLabel="Supprimer"
        onCancel={() => setDeleting(false)}
        onConfirm={() => {
          setDeleting(false);
          void personal.deleteList(id).then((ok) => {
            if (ok) back();
            else setMessage("La liste n'a pas pu être supprimée. Réessaie.");
          });
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingTop: 8, gap: 12, paddingBottom: 40 },
  progress: { color: colors.muted, fontSize: 14, fontWeight: "700" },
  addRow: { flexDirection: "row", gap: 8 },
  input: { flex: 1, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line, borderRadius: radius.input, minHeight: 52, paddingHorizontal: 16, fontSize: 16, color: colors.ink },
  addButton: { width: 52, height: 52, borderRadius: radius.input, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: 14, fontWeight: "600" },
  item: { flexDirection: "row", alignItems: "center", backgroundColor: colors.white, borderRadius: radius.tile, paddingRight: 6, ...softShadow },
  itemMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 14, minHeight: 56 },
  box: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: colors.sage, alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  itemName: { color: colors.ink, fontSize: 17 },
  itemDone: { textDecorationLine: "line-through", color: colors.muted },
  itemMeta: { color: colors.muted, fontSize: 13.5, marginTop: 2 },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  textButton: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, justifyContent: "center" },
  textButtonLabel: { color: colors.forest, fontSize: 15, fontWeight: "700" },
});
