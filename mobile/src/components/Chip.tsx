import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ChipKind } from "../domain/preferences";
import { colors, radius } from "../theme";

const KIND_ICON: Record<ChipKind, keyof typeof Ionicons.glyphMap> = {
  allergy: "alert-circle",
  diet: "leaf-outline",
  avoid: "remove-circle-outline",
  pref: "heart-outline",
  info: "time-outline",
};

/** Pastille d'affichage. Les allergies ont leur propre style (rouge brique + icône d'alerte), jamais confondues avec une préférence. */
export function Chip({ label, kind, icon }: { label: string; kind: ChipKind; icon?: keyof typeof Ionicons.glyphMap }) {
  const danger = kind === "allergy";
  return (
    <View style={[styles.chip, danger && styles.chipDanger, kind === "avoid" && styles.chipAvoid]} accessibilityLabel={label}>
      <Ionicons name={icon ?? KIND_ICON[kind]} size={15} color={danger ? colors.danger : colors.forest} />
      <Text style={[styles.text, danger && styles.textDanger]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

interface SelectProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** « danger » : réservé aux allergies. */
  tone?: "default" | "danger";
  disabled?: boolean;
}

/** Pastille à cocher (préférences). */
export function SelectChip({ label, selected, onPress, tone = "default", disabled }: SelectProps) {
  const danger = tone === "danger";
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.select,
        danger && styles.selectDanger,
        selected && (danger ? styles.selectDangerOn : styles.selectOn),
        pressed && styles.pressed,
      ]}
    >
      {selected ? <Ionicons name="checkmark" size={16} color={danger ? colors.white : colors.cream} /> : null}
      <Text style={[styles.selectText, danger && styles.selectTextDanger, selected && styles.selectTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.pale,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    minHeight: 34,
    maxWidth: "100%",
  },
  chipDanger: { backgroundColor: colors.dangerBg, borderWidth: 1, borderColor: colors.danger },
  chipAvoid: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  text: { color: colors.forest, fontSize: 13, fontWeight: "600", flexShrink: 1 },
  textDanger: { color: colors.danger, fontWeight: "700" },
  select: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  selectOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  selectDanger: { borderColor: "#D9B3AE" },
  selectDangerOn: { backgroundColor: colors.danger, borderColor: colors.danger },
  selectText: { color: colors.ink, fontSize: 15, fontWeight: "600" },
  selectTextDanger: { color: colors.danger },
  selectTextOn: { color: colors.cream },
  pressed: { opacity: 0.85 },
});
