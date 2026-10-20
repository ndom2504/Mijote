import { useCallback, useEffect, useReducer, useRef } from "react";
import { BackHandler } from "react-native";
import { authReducer, initialAuthState } from "../auth/flow";
import { DEFAULT_DIAL_COUNTRY } from "../data/dialCodes";
import { AuthFlow } from "../screens/AuthFlow";
import { AuthSuccessScreen } from "../screens/auth/AuthSuccessScreen";
import { PhoneCodeScreen } from "../screens/auth/PhoneCodeScreen";
import { PhoneNumberScreen, type PhoneDraft } from "../screens/auth/PhoneNumberScreen";
import { WelcomeScreen } from "../screens/auth/WelcomeScreen";

interface Props {
  base: string;
  /** Appelé une seule fois, quand le serveur a validé la connexion et que l'écran de succès se ferme. */
  onAuthenticated: (token: string) => void;
  /** Démonstration locale, réservée au développement. */
  onDemo?: () => void;
}

/** Enchaîne bienvenue → (Google | téléphone : numéro, code) → succès → accueil. */
export function AuthNavigator({ base, onAuthenticated, onDemo }: Props) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);
  const draft = useRef<PhoneDraft>({ dialCountry: DEFAULT_DIAL_COUNTRY, national: "" });

  // Retour matériel Android : revient à l'écran précédent ; sur la bienvenue, laisse l'application se fermer.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (state.screen === "welcome") return false;
      dispatch({ type: "back" });
      return true;
    });
    return () => subscription.remove();
  }, [state.screen]);

  const signedIn = useCallback(
    (via: "google" | "phone" | "email") => (token: string, isNewUser: boolean) =>
      dispatch({ type: "signed_in", token, isNewUser, via }),
    [],
  );

  switch (state.screen) {
    case "email":
      return (
        <AuthFlow
          base={base}
          onAuthenticated={(token) => signedIn("email")(token, false)}
          onBack={() => dispatch({ type: "back" })}
        />
      );
    case "phone":
      return (
        <PhoneNumberScreen
          base={base}
          draft={draft.current}
          onDraftChange={(next) => {
            draft.current = next;
          }}
          onCodeSent={(phone, resendAt) => dispatch({ type: "code_sent", phone, resendAt })}
          onBack={() => dispatch({ type: "back" })}
        />
      );
    case "code":
      return (
        <PhoneCodeScreen
          base={base}
          phone={state.phone ?? ""}
          resendAt={state.resendAt}
          onResendScheduled={(resendAt) => dispatch({ type: "resend_scheduled", resendAt })}
          onVerified={signedIn("phone")}
          onChangeNumber={() => dispatch({ type: "change_number" })}
          onBack={() => dispatch({ type: "back" })}
        />
      );
    case "success":
      return (
        <AuthSuccessScreen
          isNewUser={state.isNewUser}
          via={state.via}
          onContinue={() => {
            if (state.token) onAuthenticated(state.token);
          }}
        />
      );
    default:
      return (
        <WelcomeScreen
          base={base}
          onSignedIn={signedIn("google")}
          onChoosePhone={() => dispatch({ type: "choose_phone" })}
          onChooseEmail={() => dispatch({ type: "choose_email" })}
          onDemo={onDemo}
        />
      );
  }
}
