import { ProfileForm, type ProfileDraft } from "@/components/ProfileForm";
import { currentUser } from "@/server/auth/current";
import { getProfile } from "@/server/profile/service";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const profile = await getProfile(user.id);
  const initial: ProfileDraft = {
    firstName: profile?.firstName ?? "",
    municipalityCode: profile?.municipalityCode ?? "",
    municipalityName: profile?.municipalityName ?? "",
    postalCode: profile?.postalCode ?? "",
    householdSize: profile?.householdSize ?? 2,
    locale: profile?.locale ?? "fr",
    weeklyBudgetCents: profile?.weeklyBudgetCents ?? 18000,
    cookingTimeMinutes: profile?.cookingTimeMinutes ?? 45,
    diets: profile?.diets ?? ["omnivore"],
    customDietNotes: profile?.customDietNotes ?? "",
    allergens: profile?.allergens ?? [],
    otherExclusions: profile?.otherExclusions.join(", ") ?? "",
    breakfastPrefs: profile?.breakfastPrefs ?? [],
    lunchPrefs: profile?.lunchPrefs ?? [],
    dinnerPrefs: profile?.dinnerPrefs ?? [],
    goals: profile?.goals ?? [],
  };
  return (
    <>
      <h1>{t(user.locale, "onboarding_title")}</h1>
      <ProfileForm locale={user.locale} initial={initial} mode="wizard" />
    </>
  );
}
