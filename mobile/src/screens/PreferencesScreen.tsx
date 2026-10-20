import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { PrimaryButton, SecondaryButton } from "../components/Buttons";
import { SelectChip } from "../components/Chip";
import { ConfirmSheet } from "../components/ConfirmSheet";
import { CountrySheet } from "../components/CountryPicker";
import { MunicipalitySheet, RemovableTag, SectionCard, Stepper, SubTitle, TagInput, Wrap } from "../components/PreferenceParts";
import { Screen } from "../components/Screen";
import { ScreenHeader } from "../components/ScreenHeader";
import { ErrorCard, LoadingCard } from "../components/StateViews";
import { allergenList, recipesAtRisk } from "../domain/allergens";
import {
  ALLERGENS,
  BREAKFAST_PREFS,
  DIETS,
  DINNER_PREFS,
  GOALS,
  LUNCH_PREFS,
  SERVINGS_RANGE,
  TIME_CHOICES,
} from "../domain/options";
import {
  addExclusion,
  exclusionMessage,
  isDirty,
  removedAllergens,
  toggleCode,
  toggleDiet,
} from "../domain/preferences";
import type { Place, Profile } from "../domain/types";
import { loadErrorMessage } from "../lib/errors";
import { flagEmoji } from "../lib/format";
import { useBackGuard, useNav } from "../navigation/NavContext";
import { useAppData } from "../state/AppData";
import { usePersonal } from "../state/Personal";
import { colors } from "../theme";

type Notice = { tone: "ok" | "warn" | "error"; text: string };

export function PreferencesScreen() {
  const { back } = useNav();
  const data = useAppData();
  const personal = usePersonal();
  const baseline = personal.profile;
  const [draft, setDraft] = useState<Profile | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [countryOpen, setCountryOpen] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const [confirmAllergy, setConfirmAllergy] = useState<string[] | null>(null);
  const [leave, setLeave] = useState<(() => void) | null>(null);
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    if (baseline && !draft) setDraft(baseline);
  }, [baseline, draft]);

  const dirty = !!(baseline && draft && isDirty(baseline, draft));
  useBackGuard(
    dirty
      ? (proceed) => {
          setLeave(() => proceed);
          return true;
        }
      : null,
  );

  // Accepte une fonction pour toujours partir de la version la plus récente du brouillon (touches rapprochées).
  const update = useCallback((patch: Partial<Profile> | ((current: Profile) => Partial<Profile>)) => {
    setNotice(null);
    setDraft((current) => (current ? { ...current, ...(typeof patch === "function" ? patch(current) : patch) } : current));
  }, []);

  const search = personal.services.profile.searchPlaces;
  const searchPlaces = useMemo(() => search ?? (async (): Promise<Place[]> => []), [search]);

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setNotice(null);
    const result = await personal.saveProfile(draft);
    setSaving(false);
    // Le message de résultat se trouve en haut de l'écran : on y revient.
    scroller.current?.scrollTo({ y: 0, animated: true });
    if (!result.ok) {
      setNotice({ tone: "error", text: result.message });
      return;
    }
    setDraft(result.profile);
    const declared = result.profile.allergens;
    const risky = [...recipesAtRisk(data.favorites, declared), ...recipesAtRisk(personal.saved, declared)];
    const distinct = new Set(risky.map((recipe) => recipe.id)).size;
    setNotice(
      distinct > 0 && declared.length > 0
        ? {
            tone: "warn",
            text: `Préférences enregistrées. ${distinct} de tes favoris ou recettes sauvegardées touchent à une allergie déclarée : elles restent visibles, avec un avertissement.`,
          }
        : { tone: "ok", text: "Préférences enregistrées. Tes recommandations sont à jour." },
    );
  };

  const requestSave = () => {
    if (!baseline || !draft) return;
    const removed = removedAllergens(baseline, draft);
    if (removed.length > 0) setConfirmAllergy(removed);
    else void save();
  };

  const discard = () => {
    if (baseline) setDraft(baseline);
    setNotice(null);
  };

  if (personal.profileStatus === "error" && !baseline) {
    return (
      <Screen>
        <ScreenHeader title="Tes préférences" onBack={back} />
        <View style={styles.pad}>
          <ErrorCard message={loadErrorMessage(personal.profileError, "tes préférences")} onRetry={personal.reloadProfile} />
        </View>
      </Screen>
    );
  }
  if (!draft) {
    return (
      <Screen>
        <ScreenHeader title="Tes préférences" onBack={back} />
        <View style={styles.pad}>
          <LoadingCard label="Chargement de tes préférences…" />
        </View>
      </Screen>
    );
  }

  const country = data.country;
  const inQuebec = country?.code === "CA";
  const timeChoices = TIME_CHOICES.includes(draft.cookingTimeMinutes as (typeof TIME_CHOICES)[number])
    ? [...TIME_CHOICES]
    : [...TIME_CHOICES, draft.cookingTimeMinutes].sort((a, b) => a - b);

  return (
    <Screen>
      <ScreenHeader title="Tes préférences" onBack={back} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scroller} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {notice ? (
            <View
              style={[styles.notice, notice.tone === "ok" && styles.noticeOk, notice.tone === "warn" && styles.noticeWarn, notice.tone === "error" && styles.noticeError]}
              accessibilityRole="alert"
            >
              <Ionicons
                name={notice.tone === "ok" ? "checkmark-circle" : notice.tone === "warn" ? "warning" : "alert-circle"}
                size={20}
                color={notice.tone === "ok" ? colors.forest : colors.danger}
              />
              <Text style={styles.noticeText}>{notice.text}</Text>
            </View>
          ) : null}
          {data.source === "demo" ? (
            <Text style={styles.demo}>Mode démonstration : tes choix restent sur cet appareil, le temps de la session.</Text>
          ) : null}

          <SectionCard title="Toi" icon="person-outline">
            <Text style={styles.label}>Prénom</Text>
            <TextInput
              value={draft.firstName}
              onChangeText={(firstName) => update({ firstName })}
              maxLength={80}
              placeholder="Ton prénom"
              placeholderTextColor="#6B7F73"
              accessibilityLabel="Prénom"
              autoCapitalize="words"
              style={styles.input}
            />
          </SectionCard>

          <SectionCard
            title="Pays et région"
            icon="location-outline"
            hint="Ton pays oriente la cuisine proposée ; il s'enregistre dès que tu le changes."
          >
            <Pressable accessibilityRole="button" onPress={() => setCountryOpen(true)} style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>Pays</Text>
                <Text style={styles.value}>{country ? `${flagEmoji(country.code)} ${country.name}`.trim() : "Non défini"}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.forest} />
            </Pressable>
            {inQuebec ? (
              search ? (
                <Pressable accessibilityRole="button" onPress={() => setPlaceOpen(true)} style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.label}>Municipalité (Québec)</Text>
                    <Text style={styles.value}>
                      {draft.municipalityName ? `${draft.municipalityName}${draft.regionName ? ` · ${draft.regionName}` : ""}` : "Non précisée"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={colors.forest} />
                </Pressable>
              ) : (
                <Text style={styles.muted}>La région se précise avec un compte Mijoté (indisponible en démonstration).</Text>
              )
            ) : (
              <Text style={styles.muted}>La région n'est précisée que pour le Québec.</Text>
            )}
          </SectionCard>

          <SectionCard title="Régime alimentaire" icon="leaf-outline" hint="Un régime de base, auquel tu peux ajouter « sans porc » ou « sans bœuf ».">
            <Wrap>
              {DIETS.map((diet) => (
                <SelectChip key={diet.code} label={diet.label} selected={draft.diets.includes(diet.code)} onPress={() => update((current) => ({ diets: toggleDiet(current.diets, diet.code) }))} />
              ))}
            </Wrap>
          </SectionCard>

          <SectionCard
            title="Allergies"
            icon="alert-circle"
            tone="danger"
            hint="Sécurité avant tout : une recette qui contient (ou peut contenir) l'un de ces allergènes n'est jamais recommandée ni proposée dans le catalogue. Ce ne sont pas de simples préférences."
          >
            <Wrap>
              {ALLERGENS.map((allergen) => (
                <SelectChip
                  key={allergen.code}
                  tone="danger"
                  label={allergen.label}
                  selected={draft.allergens.includes(allergen.code)}
                  onPress={() => update((current) => ({ allergens: toggleCode(current.allergens, allergen.code) }))}
                />
              ))}
            </Wrap>
            <Text style={styles.dangerNote}>
              {draft.allergens.length > 0
                ? `Exclus : ${allergenList(draft.allergens)}.`
                : "Aucune allergie déclarée. Coche tout allergène à éviter absolument."}
            </Text>
          </SectionCard>

          <SectionCard
            title="Ingrédients à éviter"
            icon="remove-circle-outline"
            hint="Simples préférences (ce que tu n'aimes pas) : ce ne sont pas des allergies. Mijoté les évite, sans garantie médicale."
          >
            <TagInput
              placeholder="Ex. : coriandre"
              onAdd={(value) => {
                const result = addExclusion(draft.otherExclusions, value);
                if (!result.ok) return exclusionMessage(result.error);
                update({ otherExclusions: result.list });
                return null;
              }}
            />
            {draft.otherExclusions.length > 0 ? (
              <Wrap>
                {draft.otherExclusions.map((term) => (
                  <RemovableTag key={term} label={term} onRemove={() => update((current) => ({ otherExclusions: current.otherExclusions.filter((item) => item !== term) }))} />
                ))}
              </Wrap>
            ) : (
              <Text style={styles.muted}>Aucun ingrédient à éviter.</Text>
            )}
          </SectionCard>

          <SectionCard title="Préférences culinaires" icon="heart-outline" hint="Pour orienter les idées proposées. Rien de tout ça n'exclut une recette.">
            <SubTitle>Objectifs</SubTitle>
            <Wrap>
              {GOALS.map((goal) => (
                <SelectChip key={goal.code} label={goal.short ?? goal.label} selected={draft.goals.includes(goal.code)} onPress={() => update((current) => ({ goals: toggleCode(current.goals, goal.code) }))} />
              ))}
            </Wrap>
            <SubTitle>Déjeuner</SubTitle>
            <Wrap>
              {BREAKFAST_PREFS.map((pref) => (
                <SelectChip key={pref.code} label={pref.label} selected={draft.breakfastPrefs.includes(pref.code)} onPress={() => update((current) => ({ breakfastPrefs: toggleCode(current.breakfastPrefs, pref.code) }))} />
              ))}
            </Wrap>
            <SubTitle>Dîner</SubTitle>
            <Wrap>
              {LUNCH_PREFS.map((pref) => (
                <SelectChip key={pref.code} label={pref.label} selected={draft.lunchPrefs.includes(pref.code)} onPress={() => update((current) => ({ lunchPrefs: toggleCode(current.lunchPrefs, pref.code) }))} />
              ))}
            </Wrap>
            <SubTitle>Souper</SubTitle>
            <Wrap>
              {DINNER_PREFS.map((pref) => (
                <SelectChip key={pref.code} label={pref.label} selected={draft.dinnerPrefs.includes(pref.code)} onPress={() => update((current) => ({ dinnerPrefs: toggleCode(current.dinnerPrefs, pref.code) }))} />
              ))}
            </Wrap>
          </SectionCard>

          <SectionCard title="Portions et temps" icon="time-outline">
            <Text style={styles.label}>Nombre de portions</Text>
            <Stepper label="Portions" value={draft.householdSize} min={SERVINGS_RANGE.min} max={SERVINGS_RANGE.max} onChange={(householdSize) => update({ householdSize })} />
            <Text style={styles.label}>Temps souhaité (préparation + cuisson)</Text>
            <Wrap>
              {timeChoices.map((minutes) => (
                <SelectChip key={minutes} label={`${minutes} min`} selected={draft.cookingTimeMinutes === minutes} onPress={() => update({ cookingTimeMinutes: minutes })} />
              ))}
            </Wrap>
            <Text style={styles.muted}>Si aucune recette ne tient dans ce temps, on propose la plus proche, en te le disant.</Text>
          </SectionCard>
        </ScrollView>

        {dirty ? (
          <View style={styles.footer}>
            <SecondaryButton label="Annuler" onPress={discard} style={styles.footerCancel} />
            <PrimaryButton label={saving ? "Enregistrement…" : "Enregistrer"} icon="checkmark" disabled={saving} onPress={requestSave} style={styles.footerSave} />
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <CountrySheet visible={countryOpen} selected={country?.code ?? null} onSelect={(code) => void data.changeCountry(code)} onClose={() => setCountryOpen(false)} />
      <MunicipalitySheet
        visible={placeOpen}
        search={searchPlaces}
        currentName={draft.municipalityName}
        onSelect={(place) => {
          update(
            place
              ? { municipalityCode: place.code, municipalityName: place.name, regionName: place.region || null }
              : { municipalityCode: "", municipalityName: null, regionName: null },
          );
          setPlaceOpen(false);
        }}
        onClose={() => setPlaceOpen(false)}
      />
      <ConfirmSheet
        visible={confirmAllergy !== null}
        danger
        title="Retirer une allergie ?"
        message={`Tu t'apprêtes à retirer : ${confirmAllergy ? allergenList(confirmAllergy) : ""}. Des recettes qui en contiennent pourront de nouveau t'être proposées. Confirme seulement si tu n'es plus allergique.`}
        confirmLabel="Oui, retirer et enregistrer"
        cancelLabel="Garder l'allergie"
        onConfirm={() => {
          setConfirmAllergy(null);
          void save();
        }}
        onCancel={() => setConfirmAllergy(null)}
      />
      <ConfirmSheet
        visible={leave !== null}
        title="Quitter sans enregistrer ?"
        message="Tes modifications ne sont pas enregistrées. Si tu quittes maintenant, elles seront perdues."
        confirmLabel="Quitter"
        cancelLabel="Rester ici"
        onConfirm={() => {
          const go = leave;
          setLeave(null);
          go?.();
        }}
        onCancel={() => setLeave(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  pad: { paddingHorizontal: 20, paddingTop: 12 },
  content: { padding: 20, paddingTop: 8, gap: 14, paddingBottom: 32 },
  notice: { flexDirection: "row", gap: 10, alignItems: "flex-start", borderRadius: 16, padding: 14 },
  noticeOk: { backgroundColor: colors.pale },
  noticeWarn: { backgroundColor: colors.peach },
  noticeError: { backgroundColor: colors.dangerBg },
  noticeText: { flex: 1, color: colors.ink, fontSize: 14.5, lineHeight: 20 },
  demo: { color: colors.muted, fontSize: 13, lineHeight: 18 },
  label: { color: colors.muted, fontSize: 13, fontWeight: "700" },
  value: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  muted: { color: colors.muted, fontSize: 13.5, lineHeight: 19 },
  input: { backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 16, minHeight: 50, paddingHorizontal: 16, fontSize: 17, color: colors.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.cream, borderRadius: 16, padding: 14, minHeight: 56 },
  rowText: { flex: 1, gap: 2 },
  dangerNote: { color: colors.danger, fontSize: 14, fontWeight: "700", lineHeight: 20 },
  footer: { flexDirection: "row", gap: 10, padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line },
  footerCancel: { flex: 1 },
  footerSave: { flex: 2 },
});
