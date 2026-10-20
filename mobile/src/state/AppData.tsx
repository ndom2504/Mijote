import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert, AppState } from "react-native";
import { mealSlotForHour, resolveMealWindows, type MealWindows } from "../config/mealWindows";
import { ApiError } from "../data/client";
import { countryByCode } from "../data/countries";
import type { RecipeRepository } from "../data/recipeRepository";
import type { Country, DailyPick, DataSource, Recipe } from "../domain/types";
import { localStamp } from "../lib/format";

export type DailyStatus = "loading" | "ready" | "empty" | "error" | "country_required";
export type FavoritesStatus = "loading" | "ready" | "error";

interface AppDataValue {
  source: DataSource;
  status: DailyStatus;
  errorCode: string | null;
  pick: DailyPick | null;
  country: Country | null;
  windows: MealWindows;
  reload: () => void;
  changeCountry: (code: string) => Promise<void>;
  favorites: Recipe[];
  favoritesStatus: FavoritesStatus;
  reloadFavorites: () => void;
  isFavorite: (recipeId: string) => boolean;
  toggleFavorite: (recipe: Recipe) => Promise<void>;
  switchToDemo: () => void;
  logout: () => void;
}

const AppDataContext = createContext<AppDataValue | null>(null);

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("AppDataProvider manquant");
  return value;
}

interface ProviderProps {
  repo: RecipeRepository;
  onSwitchToDemo: () => void;
  onLogout: () => void;
  onSessionExpired: () => void;
  children: ReactNode;
}

export function AppDataProvider({ repo, onSwitchToDemo, onLogout, onSessionExpired, children }: ProviderProps) {
  const [status, setStatus] = useState<DailyStatus>("loading");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [pick, setPick] = useState<DailyPick | null>(null);
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [favoritesStatus, setFavoritesStatus] = useState<FavoritesStatus>("loading");
  // Réglage utilisateur des plages horaires : branché à l'écran de profil lors d'une prochaine étape.
  const [userWindows] = useState<Partial<MealWindows> | null>(null);
  const pickRef = useRef<DailyPick | null>(null);
  pickRef.current = pick;

  const country = pick?.country ?? countryByCode("CA");
  const windows = useMemo(() => resolveMealWindows(pick?.country?.code, userWindows), [pick?.country?.code, userWindows]);

  const handleFailure = useCallback(
    (caught: unknown): string => {
      if (caught instanceof ApiError && caught.status === 401) onSessionExpired();
      return caught instanceof ApiError ? caught.message : "unreachable";
    },
    [onSessionExpired],
  );

  const loadDaily = useCallback(async () => {
    setStatus("loading");
    setErrorCode(null);
    try {
      const stamp = localStamp();
      let next = await repo.daily(stamp);
      const expected = mealSlotForHour(stamp.hour, resolveMealWindows(next.country?.code, userWindows));
      if (expected !== next.slot) next = await repo.daily({ ...stamp, slot: expected });
      setPick(next);
      setStatus(next.recipe ? "ready" : "empty");
    } catch (caught) {
      const code = handleFailure(caught);
      if (code === "country_required") setStatus("country_required");
      else {
        setErrorCode(code);
        setStatus("error");
      }
    }
  }, [repo, userWindows, handleFailure]);

  const loadFavorites = useCallback(async () => {
    setFavoritesStatus("loading");
    try {
      setFavorites(await repo.favorites());
      setFavoritesStatus("ready");
    } catch (caught) {
      handleFailure(caught);
      setFavoritesStatus("error");
    }
  }, [repo, handleFailure]);

  useEffect(() => {
    void loadDaily();
    void loadFavorites();
  }, [loadDaily, loadFavorites]);

  // Le repas change avec l'heure : on actualise au retour dans l'application.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active" || !pickRef.current) return;
      const stamp = localStamp();
      const expected = mealSlotForHour(stamp.hour, resolveMealWindows(pickRef.current.country?.code, userWindows));
      if (pickRef.current.date !== stamp.date || pickRef.current.slot !== expected) void loadDaily();
    });
    return () => subscription.remove();
  }, [loadDaily, userWindows]);

  const changeCountry = useCallback(
    async (code: string) => {
      try {
        await repo.setCountry(code);
      } catch (caught) {
        handleFailure(caught);
        Alert.alert("Pays non enregistré", "Le changement de pays n'a pas pu être enregistré. Réessayez.");
        return;
      }
      await loadDaily();
    },
    [repo, handleFailure, loadDaily],
  );

  const isFavorite = useCallback((recipeId: string) => favorites.some((item) => item.id === recipeId), [favorites]);

  const toggleFavorite = useCallback(
    async (recipe: Recipe) => {
      const previous = favorites;
      const wasFavorite = previous.some((item) => item.id === recipe.id);
      setFavorites(wasFavorite ? previous.filter((item) => item.id !== recipe.id) : [recipe, ...previous]);
      try {
        await repo.setFavorite(recipe, !wasFavorite);
      } catch (caught) {
        handleFailure(caught);
        setFavorites(previous);
        Alert.alert("Favori non enregistré", "Le changement n'a pas pu être enregistré. Réessayez.");
      }
    },
    [favorites, repo, handleFailure],
  );

  const value: AppDataValue = {
    source: repo.source,
    status,
    errorCode,
    pick,
    country,
    windows,
    reload: () => void loadDaily(),
    changeCountry,
    favorites,
    favoritesStatus,
    reloadFavorites: () => void loadFavorites(),
    isFavorite,
    toggleFavorite,
    switchToDemo: onSwitchToDemo,
    logout: onLogout,
  };

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
