import { NextResponse } from "next/server";
import { currentUser, sessionCookie } from "@/server/auth/current";
import { userFromSessionToken, type SessionUser } from "@/server/auth/service";
import { readyDatabase } from "@/server/db/init";
import { logError } from "@/server/db/client";

const buckets = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function mobileClient(request: Request): boolean {
  return request.headers.get("x-mijote-client") === "mobile";
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  return match?.[1] ?? null;
}

export function clientKey(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

export function withSessionCookie(response: NextResponse, token: string) {
  const cookie = sessionCookie(token);
  response.cookies.set(cookie.name, cookie.value, cookie.options);
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set("mijote_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return response;
}

function cors(response: Response, request: Request): Response {
  if (!mobileClient(request)) return response;
  const headers = new Headers(response.headers);
  const origin = request.headers.get("origin");
  if (origin) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Mijote-Client");
  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Vary", "Origin");
  return new Response(response.body, { status: response.status, headers });
}

type RouteContext = { params: Promise<Record<string, string>> };

export function api(
  handler: (request: Request, user: SessionUser | null, context: RouteContext) => Promise<Response>,
  options?: { auth?: boolean; admin?: boolean },
) {
  return async (request: Request, context: RouteContext) => {
    const mobile = mobileClient(request);
    try {
      if (request.method === "OPTIONS" && mobile) return cors(new Response(null, { status: 204 }), request);
      await readyDatabase();
      if (!["GET", "HEAD"].includes(request.method) && !mobile && !sameOrigin(request)) return fail("origin", 403);
      const token = mobile ? bearerToken(request) : null;
      const user = token ? await userFromSessionToken(token) : await currentUser();
      if (options?.auth && !user) return cors(fail("unauthenticated", 401), request);
      if (options?.admin && user?.role !== "admin") return cors(fail("forbidden", 403), request);
      return cors(await handler(request, user, context), request);
    } catch (error) {
      await logError(error, request.url);
      return cors(fail("server", 500), request);
    }
  };
}
