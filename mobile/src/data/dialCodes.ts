/** Indicatifs téléphoniques proposés. Le Canada est en tête et sert de choix par défaut. */
export interface DialCountry {
  /** Code ISO du pays (unique, contrairement à l'indicatif : +1 est partagé). */
  code: string;
  name: string;
  /** Indicatif avec le « + ». */
  dial: string;
}

const RAW: readonly DialCountry[] = [
  { code: "AR", name: "Argentine", dial: "+54" },
  { code: "AU", name: "Australie", dial: "+61" },
  { code: "DE", name: "Allemagne", dial: "+49" },
  { code: "DZ", name: "Algérie", dial: "+213" },
  { code: "BE", name: "Belgique", dial: "+32" },
  { code: "BR", name: "Brésil", dial: "+55" },
  { code: "CM", name: "Cameroun", dial: "+237" },
  { code: "CL", name: "Chili", dial: "+56" },
  { code: "CN", name: "Chine", dial: "+86" },
  { code: "CO", name: "Colombie", dial: "+57" },
  { code: "KR", name: "Corée du Sud", dial: "+82" },
  { code: "CI", name: "Côte d'Ivoire", dial: "+225" },
  { code: "DK", name: "Danemark", dial: "+45" },
  { code: "EG", name: "Égypte", dial: "+20" },
  { code: "ES", name: "Espagne", dial: "+34" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "GR", name: "Grèce", dial: "+30" },
  { code: "HT", name: "Haïti", dial: "+509" },
  { code: "IN", name: "Inde", dial: "+91" },
  { code: "IE", name: "Irlande", dial: "+353" },
  { code: "IT", name: "Italie", dial: "+39" },
  { code: "JP", name: "Japon", dial: "+81" },
  { code: "LB", name: "Liban", dial: "+961" },
  { code: "LU", name: "Luxembourg", dial: "+352" },
  { code: "MA", name: "Maroc", dial: "+212" },
  { code: "MU", name: "Maurice", dial: "+230" },
  { code: "MX", name: "Mexique", dial: "+52" },
  { code: "NO", name: "Norvège", dial: "+47" },
  { code: "NL", name: "Pays-Bas", dial: "+31" },
  { code: "PE", name: "Pérou", dial: "+51" },
  { code: "PH", name: "Philippines", dial: "+63" },
  { code: "PL", name: "Pologne", dial: "+48" },
  { code: "PT", name: "Portugal", dial: "+351" },
  { code: "DO", name: "République dominicaine", dial: "+1" },
  { code: "CD", name: "République démocratique du Congo", dial: "+243" },
  { code: "RO", name: "Roumanie", dial: "+40" },
  { code: "GB", name: "Royaume-Uni", dial: "+44" },
  { code: "SN", name: "Sénégal", dial: "+221" },
  { code: "SE", name: "Suède", dial: "+46" },
  { code: "CH", name: "Suisse", dial: "+41" },
  { code: "TH", name: "Thaïlande", dial: "+66" },
  { code: "TN", name: "Tunisie", dial: "+216" },
  { code: "TR", name: "Turquie", dial: "+90" },
  { code: "VN", name: "Vietnam", dial: "+84" },
];

const FIRST: readonly DialCountry[] = [
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "US", name: "États-Unis", dial: "+1" },
];

export const DIAL_COUNTRIES: readonly DialCountry[] = [
  ...FIRST,
  ...[...RAW].sort((a, b) => a.name.localeCompare(b.name, "fr")),
];

export const DEFAULT_DIAL_COUNTRY = "CA";

export function dialCountryByCode(code: string | null | undefined): DialCountry {
  return DIAL_COUNTRIES.find((country) => country.code === code) ?? DIAL_COUNTRIES[0]!;
}

/** Pays d'inscription connu (liste de l'application) vers le pays de l'indicatif, sinon le Canada. */
export function defaultDialCountry(countryCode: string | null | undefined): string {
  return DIAL_COUNTRIES.some((country) => country.code === countryCode) ? (countryCode as string) : DEFAULT_DIAL_COUNTRY;
}
