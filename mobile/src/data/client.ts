import Constants from "expo-constants";
import { Platform } from "react-native";

const CLIENT_HEADERS = { "Content-Type": "application/json", "X-Mijote-Client": "mobile" };

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterSeconds?: number) {
    super(message);
  }
}

/** Adresse de l'API : variable d'environnement, sinon l'ordinateur qui sert Expo, sinon l'émulateur. */
export function apiBase(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (configured) return configured.replace(/\/$/, "");
  const hostUri = Constants.expoConfig?.hostUri || "";
  const host = hostUri.split(":")[0];
  if (host) return `http://${host}:3001`;
  if (Platform.OS === "android") return "http://10.0.2.2:3001";
  return "http://localhost:3001";
}

export async function request<T>(
  base: string,
  path: string,
  options: { method?: string; token?: string | null; body?: unknown } = {},
): Promise<T> {
  const { method = "GET", token, body } = options;
  const headers: Record<string, string> = { ...CLIENT_HEADERS };
  if (body === undefined) delete headers["Content-Type"];
  if (token) headers.Authorization = `Bearer ${token}`;
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("unreachable", 0);
  }
  const data = (await response.json().catch(() => ({}))) as { error?: string; retryAfterSeconds?: number } & Record<string, unknown>;
  if (!response.ok) {
    const retry = typeof data.retryAfterSeconds === "number" ? data.retryAfterSeconds : Number(response.headers.get("Retry-After")) || undefined;
    throw new ApiError(data.error || "server", response.status, retry);
  }
  return data as T;
}
