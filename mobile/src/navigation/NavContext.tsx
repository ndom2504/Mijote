import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { BackHandler } from "react-native";
import type { Country, Recipe } from "../domain/types";

export type Tab = "home" | "recipes" | "grocery" | "favorites" | "profile";

export type Route =
  | { name: "recipe"; recipe: Recipe }
  | { name: "trip" }
  | { name: "tripCountry"; country: Country }
  | { name: "preferences" }
  | { name: "saved" }
  | { name: "list"; id: string; title: string };

/** Garde de retour : renvoie `true` si elle prend la main (ex. confirmation), et appelle `proceed` pour continuer. */
export type BackGuard = (proceed: () => void) => boolean;

interface NavValue {
  tab: Tab;
  route: Route | null;
  goTab: (tab: Tab) => void;
  openRecipe: (recipe: Recipe) => void;
  openTrip: () => void;
  openTripCountry: (country: Country) => void;
  openPreferences: () => void;
  openSaved: () => void;
  openList: (id: string, title: string) => void;
  /** Remplace le titre de la liste ouverte (après un renommage). */
  retitleList: (title: string) => void;
  back: () => void;
  setBackGuard: (guard: BackGuard | null) => void;
}

const NavContext = createContext<NavValue | null>(null);

export function useNav(): NavValue {
  const value = useContext(NavContext);
  if (!value) throw new Error("NavProvider manquant");
  return value;
}

/** Enregistre une garde de retour tant que l'écran est affiché. */
export function useBackGuard(guard: BackGuard | null) {
  const { setBackGuard } = useNav();
  const ref = useRef(guard);
  ref.current = guard;
  const active = guard !== null;
  useEffect(() => {
    if (!active) return;
    setBackGuard((proceed) => (ref.current ? ref.current(proceed) : false));
    return () => setBackGuard(null);
  }, [active, setBackGuard]);
}

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>("home");
  const [stack, setStack] = useState<Route[]>([]);
  const guardRef = useRef<BackGuard | null>(null);

  const push = useCallback((route: Route) => setStack((current) => [...current, route]), []);
  const goTab = useCallback((next: Tab) => {
    setStack([]);
    setTab(next);
  }, []);
  const openRecipe = useCallback((recipe: Recipe) => push({ name: "recipe", recipe }), [push]);
  const openTrip = useCallback(() => push({ name: "trip" }), [push]);
  const openTripCountry = useCallback((country: Country) => push({ name: "tripCountry", country }), [push]);
  const openPreferences = useCallback(() => push({ name: "preferences" }), [push]);
  const openSaved = useCallback(() => push({ name: "saved" }), [push]);
  const openList = useCallback((id: string, title: string) => push({ name: "list", id, title }), [push]);
  const retitleList = useCallback(
    (title: string) => setStack((current) => current.map((route, index) => (index === current.length - 1 && route.name === "list" ? { ...route, title } : route))),
    [],
  );
  const setBackGuard = useCallback((guard: BackGuard | null) => {
    guardRef.current = guard;
  }, []);

  const pop = useCallback(() => setStack((current) => current.slice(0, -1)), []);
  const back = useCallback(() => {
    if (guardRef.current && guardRef.current(pop)) return;
    pop();
  }, [pop]);

  // Bouton retour d'Android : ferme l'écran ouvert, puis revient à l'accueil, puis quitte.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 0) {
        back();
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [stack.length, tab, back]);

  const value = useMemo<NavValue>(
    () => ({
      tab,
      route: stack[stack.length - 1] ?? null,
      goTab,
      openRecipe,
      openTrip,
      openTripCountry,
      openPreferences,
      openSaved,
      openList,
      retitleList,
      back,
      setBackGuard,
    }),
    [tab, stack, goTab, openRecipe, openTrip, openTripCountry, openPreferences, openSaved, openList, retitleList, back, setBackGuard],
  );

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
