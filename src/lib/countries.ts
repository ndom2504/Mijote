export const COUNTRIES = [
  { code: "CA", name: "Canada" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgique" },
  { code: "CH", name: "Suisse" },
  { code: "US", name: "États-Unis" },
  { code: "MX", name: "Mexique" },
  { code: "IT", name: "Italie" },
  { code: "ES", name: "Espagne" },
  { code: "PT", name: "Portugal" },
  { code: "GB", name: "Royaume-Uni" },
  { code: "DE", name: "Allemagne" },
  { code: "MA", name: "Maroc" },
  { code: "DZ", name: "Algérie" },
  { code: "TN", name: "Tunisie" },
  { code: "LB", name: "Liban" },
  { code: "HT", name: "Haïti" },
  { code: "SN", name: "Sénégal" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "BR", name: "Brésil" },
  { code: "PE", name: "Pérou" },
  { code: "IN", name: "Inde" },
  { code: "TH", name: "Thaïlande" },
  { code: "VN", name: "Vietnam" },
  { code: "JP", name: "Japon" },
  { code: "CN", name: "Chine" },
  { code: "GR", name: "Grèce" },
] as const;

export type CountryCode = (typeof COUNTRIES)[number]["code"];

export function countryByCode(code: string | null | undefined) {
  return COUNTRIES.find((country) => country.code === code) ?? null;
}
