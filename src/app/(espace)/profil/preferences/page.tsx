import { ProfileForm, type ProfileDraft } from "@/components/ProfileForm";
import { currentUser } from "@/server/auth/current";
import { getProfile } from "@/server/profile/service";
import { t } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const profile = await getProfile(user.id);
  if (!profile) redirect("/onboarding");
  const initial: ProfileDraft = {
    firstName: profile.firstName ?? "",
    municipalityCode: profile.municipalityCode ?? "",
    municipalityName: profile.municipalityName ?? "",
    postalCode: profile.postalCode ?? "",
    householdSize: profile.householdSize,
    locale: profile.locale,
    weeklyBudgetCents: profile.weeklyBudgetCents,
    cookingTimeMinutes: profile.cookingTimeMinutes,
    diets: profile.diets,
    customDietNotes: profile.customDietNotes ?? "",
    allergens: profile.allergens,
    otherExclusions: profile.otherExclusions.join(", "),
    breakfastPrefs: profile.breakfastPrefs,
    lunchPrefs: profile.lunchPrefs,
    dinnerPrefs: profile.dinnerPrefs,
    goals: profile.goals,
  };
  return (
    <>
      <h1>{t(user.locale, "preferences")}</h1>
      <ProfileForm locale={user.locale} initial={initial} mode="edit" />
    </>
  );
}
