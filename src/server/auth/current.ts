import { cookies } from "next/headers";
import { cache } from "react";
import { userFromSessionToken, type SessionUser } from "@/server/auth/service";

export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  return userFromSessionToken(jar.get("mijote_session")?.value);
});

export function sessionCookie(token: string) {
  return {
    name: "mijote_session",
    value: token,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  };
}
