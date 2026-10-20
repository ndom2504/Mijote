import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { apiBase, request } from "./src/data/client";
import { createDemoRepository, createRemoteRepository } from "./src/data/recipeRepository";
import { createDemoStore } from "./src/data/demo/store";
import { createDemoServices } from "./src/data/services/demo";
import { createRemoteServices } from "./src/data/services/remote";
import { readToken, writeToken } from "./src/data/tokenStore";
import { AuthNavigator } from "./src/navigation/AuthNavigator";
import { NavProvider } from "./src/navigation/NavContext";
import { LoadingGate, RootNavigator } from "./src/navigation/RootNavigator";
import { SplashScreen } from "./src/screens/SplashScreen";
import { AppDataProvider } from "./src/state/AppData";
import { PersonalProvider } from "./src/state/Personal";

type Session = { mode: "api"; token: string } | { mode: "demo" };
type Phase = "splash" | "resume" | "auth" | "main";

const FORCE_DEMO = process.env.EXPO_PUBLIC_DATA_SOURCE === "demo";

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Root />
    </SafeAreaProvider>
  );
}

function Root() {
  const base = apiBase();
  const [phase, setPhase] = useState<Phase>("splash");
  const [session, setSession] = useState<Session | null>(null);
  const startMain = useCallback((next: Session) => {
    setSession(next);
    setPhase("main");
  }, []);

  // Après la vidéo : démonstration forcée, session enregistrée, ou connexion.
  useEffect(() => {
    if (phase !== "resume") return;
    if (FORCE_DEMO) {
      startMain({ mode: "demo" });
      return;
    }
    let cancelled = false;
    void readToken().then((token) => {
      if (cancelled) return;
      if (token) startMain({ mode: "api", token });
      else setPhase("auth");
    });
    return () => {
      cancelled = true;
    };
  }, [phase, startMain]);

  // Le dépôt de recettes et les services personnels partagent le même magasin en démonstration.
  const { repo, services } = useMemo(() => {
    if (session?.mode === "api") {
      return { repo: createRemoteRepository(base, session.token), services: createRemoteServices(base, session.token) };
    }
    const store = createDemoStore();
    return { repo: createDemoRepository(store), services: createDemoServices(store) };
  }, [session, base]);

  const leave = useCallback(async () => {
    if (session?.mode === "api") {
      try {
        await request(base, "/api/auth/logout", { method: "POST", token: session.token, body: {} });
      } catch {
        /* la session locale est effacée même si le serveur est injoignable */
      }
      await writeToken(null);
    }
    setSession(null);
    setPhase(FORCE_DEMO ? "main" : "auth");
    if (FORCE_DEMO) setSession({ mode: "demo" });
  }, [session, base]);

  const expire = useCallback(() => {
    void writeToken(null);
    setSession(null);
    setPhase("auth");
  }, []);

  if (phase === "splash") return <SplashScreen onDone={() => setPhase("resume")} />;
  if (phase === "resume") return <LoadingGate />;

  if (phase === "auth" || !session) {
    return (
      <AuthNavigator
        base={base}
        onAuthenticated={(token) => {
          void writeToken(token);
          startMain({ mode: "api", token });
        }}
        onDemo={__DEV__ ? () => startMain({ mode: "demo" }) : undefined}
      />
    );
  }

  return (
    <AppDataProvider
      key={session.mode === "api" ? session.token : "demo"}
      repo={repo}
      onSwitchToDemo={() => startMain({ mode: "demo" })}
      onLogout={() => void leave()}
      onSessionExpired={expire}
    >
      <PersonalProvider services={services} onSessionExpired={expire}>
        <NavProvider>
          <RootNavigator />
        </NavProvider>
      </PersonalProvider>
    </AppDataProvider>
  );
}
