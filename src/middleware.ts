import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Requête de préparation CORS : le navigateur annonce l'en-tête personnalisé sans l'envoyer.
  const announced = (request.headers.get("access-control-request-headers") ?? "").toLowerCase().split(",").map((item) => item.trim());
  const mobilePreflight =
    request.nextUrl.pathname.startsWith("/api/") &&
    (request.headers.get("x-mijote-client") === "mobile" || announced.includes("x-mijote-client"));
  if (request.method === "OPTIONS" && mobilePreflight) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": request.headers.get("origin") ?? "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Mijote-Client",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        Vary: "Origin",
      },
    });
  }
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mijote-path", request.nextUrl.pathname);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
