import { useCallback, useEffect, useRef, useState } from "react";
import { readStoredPlace, writeStoredPlace } from "../data/placeStore";
import type { StoresService } from "../data/services/types";
import type { NearbyStores, StorePlace } from "../domain/types";

export type StoresStatus = "idle" | "loading" | "ready" | "error";

/**
 * Épiceries près de la personne : lieu choisi sur l'appareil, sinon lieu du profil (code postal ou municipalité).
 * `service` est absent en démonstration : la recherche passe toujours par le serveur.
 */
export function useNearbyStores(service: StoresService | undefined, onError: (caught: unknown) => string) {
  const [status, setStatus] = useState<StoresStatus>(service ? "loading" : "idle");
  const [result, setResult] = useState<NearbyStores | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [chosen, setChosen] = useState<StorePlace | null>(null);
  const request = useRef(0);

  const load = useCallback(
    async (place: StorePlace | null) => {
      if (!service) return;
      const id = ++request.current;
      setStatus("loading");
      setErrorCode(null);
      try {
        const next = await service.nearby(place);
        if (id !== request.current) return;
        setResult(next);
        setStatus("ready");
      } catch (caught) {
        if (id !== request.current) return;
        setErrorCode(onError(caught));
        setStatus("error");
      }
    },
    [service, onError],
  );

  useEffect(() => {
    if (!service) return;
    let active = true;
    void readStoredPlace().then((stored) => {
      if (!active) return;
      setChosen(stored);
      void load(stored);
    });
    return () => {
      active = false;
    };
    // Rechargé seulement quand le service change (nouvelle session), pas à chaque rendu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [service]);

  const choose = useCallback(
    async (place: StorePlace) => {
      setChosen(place);
      await writeStoredPlace(place);
      await load(place);
    },
    [load],
  );

  const reset = useCallback(async () => {
    setChosen(null);
    await writeStoredPlace(null);
    await load(null);
  }, [load]);

  // Référence stable : l'écran de recherche relance sa requête quand cette fonction change.
  const search = useCallback(
    async (term: string) => {
      try {
        return service ? await service.searchPlaces(term) : [];
      } catch (caught) {
        onError(caught);
        throw caught;
      }
    },
    [service, onError],
  );

  return {
    available: Boolean(service),
    status,
    result,
    errorCode,
    chosen,
    reload: () => void load(chosen),
    choose,
    reset,
    search,
  };
}
