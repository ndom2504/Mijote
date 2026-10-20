/**
 * Accès réseau poli aux services ouverts utilisés pour trouver des épiceries :
 * - Nominatim (OpenStreetMap) : recherche de lieux et de commerces ;
 * - Zippopotam.us : coordonnées approximatives d'une zone de code postal canadien (3 premiers caractères).
 *
 * Règles de la politique d'utilisation de Nominatim respectées ici : une requête par seconde au plus
 * (file d'attente commune à tout le processus), User-Agent explicite et résultats mis en cache en base.
 * Pour un trafic élevé, pointer NOMINATIM_URL vers sa propre instance.
 */

export type Fetcher = (url: string, init: { headers: Record<string, string>; signal: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>;

let fetcher: Fetcher = (url, init) => fetch(url, init);
let spacingMs = 1100;
let tail: Promise<void> = Promise.resolve();
let lastAt = 0;
let pending = 0;

const MAX_PENDING = 12;
const TIMEOUT_MS = 12000;

/** Pour les tests : remplace le réseau et l'espacement entre requêtes. */
export function configureRemote(options: { fetcher?: Fetcher | null; spacingMs?: number }) {
  if (options.fetcher !== undefined) fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
  if (options.spacingMs !== undefined) spacingMs = options.spacingMs;
}

export class RemoteError extends Error {
  constructor(public readonly reason: "busy" | "network" | "status") {
    super(`remote_${reason}`);
  }
}

function userAgent(): string {
  const contact = process.env.MIJOTE_CONTACT?.trim();
  return `Mijote/1.0 (application de recettes et d'épicerie${contact ? `; ${contact}` : ""})`;
}

function nominatimBase(): string {
  return (process.env.NOMINATIM_URL?.trim() || "https://nominatim.openstreetmap.org").replace(/\/+$/, "");
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function get(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(url, { headers: { "User-Agent": userAgent(), Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) throw new RemoteError("status");
    return await response.json();
  } catch (error) {
    if (error instanceof RemoteError) throw error;
    throw new RemoteError("network");
  } finally {
    clearTimeout(timer);
  }
}

/** Requête Nominatim, espacée d'au moins `spacingMs` de la précédente. */
export function nominatim(path: string, params: Record<string, string | number>): Promise<unknown> {
  if (pending >= MAX_PENDING) return Promise.reject(new RemoteError("busy"));
  const url = new URL(`${nominatimBase()}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
  url.searchParams.set("format", "jsonv2");
  pending += 1;
  const run = tail.then(async () => {
    const wait = lastAt + spacingMs - Date.now();
    if (wait > 0) await sleep(wait);
    lastAt = Date.now();
    return get(url.toString());
  });
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run.finally(() => {
    pending -= 1;
  });
}

export function postalZone(fsa: string): Promise<unknown> {
  return get(`https://api.zippopotam.us/ca/${encodeURIComponent(fsa)}`);
}
