import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Alert } from "react-native";
import { ApiError } from "../data/client";
import type { PersonalServices } from "../data/services/types";
import { dashboardStats, type DashboardStats } from "../domain/preferences";
import type { Catalog, Profile, Recipe, ShoppingListSummary } from "../domain/types";
import { listErrorMessage } from "../domain/lists";
import { avatarErrorMessage, saveErrorMessage } from "../lib/errors";
import { useAppData } from "./AppData";

export type LoadStatus = "loading" | "ready" | "error";
export type CatalogStatus = "idle" | LoadStatus;

interface Part<T> {
  status: LoadStatus;
  errorCode: string | null;
  items: T[];
}

interface PersonalValue {
  services: PersonalServices;
  profile: Profile | null;
  profileStatus: LoadStatus;
  profileError: string | null;
  reloadProfile: () => void;
  /** Enregistre les préférences, puis actualise la recette du jour et le catalogue. */
  saveProfile: (next: Profile) => Promise<{ ok: true; profile: Profile } | { ok: false; message: string }>;

  /** Photo de profil (adresse `data:`) ; `null` tant qu'elle charge ou si aucune n'est définie (initiales affichées). */
  avatarUri: string | null;
  setAvatar: (base64: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  removeAvatar: () => Promise<{ ok: true } | { ok: false; message: string }>;

  saved: Recipe[];
  savedStatus: LoadStatus;
  reloadSaved: () => void;
  isSaved: (recipeId: string) => boolean;
  toggleSaved: (recipe: Recipe) => Promise<void>;

  lists: ShoppingListSummary[];
  listsStatus: LoadStatus;
  reloadLists: () => void;
  createList: (name: string) => Promise<{ ok: true; id: string } | { ok: false; message: string }>;
  renameList: (id: string, name: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  deleteList: (id: string) => Promise<boolean>;

  catalog: Catalog | null;
  catalogStatus: CatalogStatus;
  loadCatalog: (force?: boolean) => void;

  stats: DashboardStats;
  /** Gère une erreur de service : session expirée → déconnexion ; renvoie le code. */
  report: (caught: unknown) => string;
}

const PersonalContext = createContext<PersonalValue | null>(null);

export function usePersonal(): PersonalValue {
  const value = useContext(PersonalContext);
  if (!value) throw new Error("PersonalProvider manquant");
  return value;
}

interface ProviderProps {
  services: PersonalServices;
  onSessionExpired: () => void;
  children: ReactNode;
}

const codeOf = (caught: unknown) => (caught instanceof ApiError ? caught.message : "unreachable");

export function PersonalProvider({ services, onSessionExpired, children }: ProviderProps) {
  const data = useAppData();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<LoadStatus>("loading");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Part<Recipe>>({ status: "loading", errorCode: null, items: [] });
  const [lists, setLists] = useState<Part<ShoppingListSummary>>({ status: "loading", errorCode: null, items: [] });
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<CatalogStatus>("idle");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const catalogWanted = useRef(false);

  const report = useCallback(
    (caught: unknown): string => {
      if (caught instanceof ApiError && caught.status === 401) onSessionExpired();
      return codeOf(caught);
    },
    [onSessionExpired],
  );

  const reloadProfile = useCallback(async () => {
    setProfileStatus("loading");
    setProfileError(null);
    try {
      setProfile(await services.profile.get());
      setProfileStatus("ready");
    } catch (caught) {
      setProfileError(report(caught));
      setProfileStatus("error");
    }
  }, [services, report]);

  const reloadSaved = useCallback(async () => {
    setSaved((current) => ({ ...current, status: "loading", errorCode: null }));
    try {
      setSaved({ status: "ready", errorCode: null, items: await services.saved.list() });
    } catch (caught) {
      setSaved((current) => ({ ...current, status: "error", errorCode: report(caught) }));
    }
  }, [services, report]);

  const reloadLists = useCallback(async () => {
    setLists((current) => ({ ...current, status: "loading", errorCode: null }));
    try {
      setLists({ status: "ready", errorCode: null, items: await services.lists.overview() });
    } catch (caught) {
      setLists((current) => ({ ...current, status: "error", errorCode: report(caught) }));
    }
  }, [services, report]);

  const loadCatalog = useCallback(
    async (force = false) => {
      catalogWanted.current = true;
      if (!force && (catalogStatus === "ready" || catalogStatus === "loading")) return;
      setCatalogStatus("loading");
      try {
        setCatalog(await services.catalog.load());
        setCatalogStatus("ready");
      } catch (caught) {
        report(caught);
        setCatalogStatus("error");
      }
    },
    [services, report, catalogStatus],
  );

  useEffect(() => {
    void reloadProfile();
    void reloadSaved();
    void reloadLists();
  }, [reloadProfile, reloadSaved, reloadLists]);

  useEffect(() => {
    let active = true;
    services.avatar
      .get()
      .then((uri) => {
        if (active) setAvatarUri(uri);
      })
      .catch((caught) => {
        // Sans photo, les initiales s'affichent : ce n'est pas une erreur bloquante, sauf session expirée.
        if (active) report(caught);
      });
    return () => {
      active = false;
    };
  }, [services, report]);

  const setAvatar = useCallback<PersonalValue["setAvatar"]>(
    async (base64) => {
      try {
        setAvatarUri(await services.avatar.set(base64));
        return { ok: true };
      } catch (caught) {
        return { ok: false, message: avatarErrorMessage(report(caught)) };
      }
    },
    [services, report],
  );

  const removeAvatar = useCallback<PersonalValue["removeAvatar"]>(async () => {
    try {
      await services.avatar.remove();
      setAvatarUri(null);
      return { ok: true };
    } catch (caught) {
      return { ok: false, message: avatarErrorMessage(report(caught)) };
    }
  }, [services, report]);

  const saveProfile = useCallback<PersonalValue["saveProfile"]>(
    async (next) => {
      try {
        await services.profile.save(next);
      } catch (caught) {
        return { ok: false, message: saveErrorMessage(report(caught)) };
      }
      // Relit le profil enregistré : le serveur reste la source de vérité (nom de municipalité, région).
      let stored = next;
      try {
        stored = await services.profile.get();
      } catch {
        /* le profil enregistré reste celui qu'on vient d'envoyer */
      }
      setProfile(stored);
      data.reload();
      if (catalogWanted.current) void loadCatalog(true);
      return { ok: true, profile: stored };
    },
    [services, report, data, loadCatalog],
  );

  const toggleSaved = useCallback(
    async (recipe: Recipe) => {
      const previous = saved.items;
      const wasSaved = previous.some((item) => item.id === recipe.id);
      setSaved((current) => ({ ...current, items: wasSaved ? previous.filter((item) => item.id !== recipe.id) : [recipe, ...previous] }));
      try {
        await services.saved.set(recipe, !wasSaved);
      } catch (caught) {
        report(caught);
        setSaved((current) => ({ ...current, items: previous }));
        Alert.alert("Sauvegarde non enregistrée", "Le changement n'a pas pu être enregistré. Réessaie.");
      }
    },
    [saved.items, services, report],
  );

  const createList = useCallback<PersonalValue["createList"]>(
    async (name) => {
      try {
        const id = await services.lists.create(name);
        await reloadLists();
        return { ok: true, id };
      } catch (caught) {
        return { ok: false, message: listErrorMessage(report(caught)) };
      }
    },
    [services, report, reloadLists],
  );

  const renameList = useCallback<PersonalValue["renameList"]>(
    async (id, name) => {
      try {
        await services.lists.rename(id, name);
        await reloadLists();
        return { ok: true };
      } catch (caught) {
        return { ok: false, message: listErrorMessage(report(caught)) };
      }
    },
    [services, report, reloadLists],
  );

  const deleteList = useCallback(
    async (id: string) => {
      try {
        await services.lists.remove(id);
        await reloadLists();
        return true;
      } catch (caught) {
        report(caught);
        return false;
      }
    },
    [services, report, reloadLists],
  );

  const value = useMemo<PersonalValue>(
    () => ({
      services,
      profile,
      profileStatus,
      profileError,
      reloadProfile: () => void reloadProfile(),
      saveProfile,
      avatarUri,
      setAvatar,
      removeAvatar,
      saved: saved.items,
      savedStatus: saved.status,
      reloadSaved: () => void reloadSaved(),
      isSaved: (recipeId: string) => saved.items.some((item) => item.id === recipeId),
      toggleSaved,
      lists: lists.items,
      listsStatus: lists.status,
      reloadLists: () => void reloadLists(),
      createList,
      renameList,
      deleteList,
      catalog,
      catalogStatus,
      loadCatalog: (force) => void loadCatalog(force),
      stats: dashboardStats({
        saved: { status: saved.status, items: saved.items },
        favorites: { status: data.favoritesStatus, items: data.favorites },
        lists: { status: lists.status, items: lists.items },
      }),
      report,
    }),
    [
      services,
      profile,
      profileStatus,
      profileError,
      reloadProfile,
      saveProfile,
      avatarUri,
      setAvatar,
      removeAvatar,
      saved,
      reloadSaved,
      toggleSaved,
      lists,
      reloadLists,
      createList,
      renameList,
      deleteList,
      catalog,
      catalogStatus,
      loadCatalog,
      data.favorites,
      data.favoritesStatus,
      report,
    ],
  );

  return <PersonalContext.Provider value={value}>{children}</PersonalContext.Provider>;
}
