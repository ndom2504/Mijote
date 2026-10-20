import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { CountryList } from "../components/CountryPicker";
import { Screen } from "../components/Screen";
import { TabBar } from "../components/TabBar";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { GroceryScreen } from "../screens/GroceryScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ListDetailScreen } from "../screens/ListDetailScreen";
import { PreferencesScreen } from "../screens/PreferencesScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { RecipeDetailScreen } from "../screens/RecipeDetailScreen";
import { RecipesScreen } from "../screens/RecipesScreen";
import { SavedRecipesScreen } from "../screens/SavedRecipesScreen";
import { TripCountryScreen, TripScreen } from "../screens/TripScreen";
import { useAppData } from "../state/AppData";
import { colors, fonts } from "../theme";
import { useNav } from "./NavContext";

function CountryOnboarding() {
  const data = useAppData();
  return (
    <Screen style={styles.onboarding}>
      <Text style={styles.onboardingTitle} accessibilityRole="header">
        Choisis ton pays
      </Text>
      <Text style={styles.onboardingText}>
        Ton pays oriente la cuisine proposée. Tu pourras le changer à tout moment. Aucune localisation n'est demandée.
      </Text>
      <CountryList selected={null} onSelect={(code) => void data.changeCountry(code)} />
    </Screen>
  );
}

export function RootNavigator() {
  const data = useAppData();
  const { tab, route } = useNav();

  if (data.status === "country_required") return <CountryOnboarding />;

  if (route?.name === "recipe") return <RecipeDetailScreen recipe={route.recipe} />;
  if (route?.name === "trip") return <TripScreen />;
  if (route?.name === "tripCountry") return <TripCountryScreen country={route.country} />;
  if (route?.name === "preferences") return <PreferencesScreen />;
  if (route?.name === "saved") return <SavedRecipesScreen />;
  if (route?.name === "list") return <ListDetailScreen key={route.id} id={route.id} title={route.title} />;

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === "home" ? <HomeScreen /> : null}
        {tab === "recipes" ? <RecipesScreen /> : null}
        {tab === "grocery" ? <GroceryScreen /> : null}
        {tab === "favorites" ? <FavoritesScreen /> : null}
        {tab === "profile" ? <ProfileScreen /> : null}
      </View>
      <TabBar />
    </View>
  );
}

export function LoadingGate() {
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={colors.cream} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  body: { flex: 1 },
  centered: { flex: 1, backgroundColor: colors.forest, alignItems: "center", justifyContent: "center" },
  onboarding: { paddingHorizontal: 20 },
  onboardingTitle: { color: colors.forest, fontFamily: fonts.serif, fontWeight: "700", fontSize: 32, marginTop: 24 },
  onboardingText: { color: colors.ink, fontSize: 16, lineHeight: 23, marginVertical: 12 },
});
