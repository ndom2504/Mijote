/**
 * Annuaire canadien des épiceries : provinces et bannières courantes par province.
 *
 * Ces bannières servent de repli quand la recherche en ligne est indisponible, et de complément à la
 * liste des commerces trouvés près de chez soi. Ce n'est PAS un inventaire des magasins d'une ville :
 * la présence d'une bannière à un endroit précis se confirme sur le site de l'enseigne.
 */

export const PROVINCES = {
  AB: "Alberta",
  BC: "Colombie-Britannique",
  MB: "Manitoba",
  NB: "Nouveau-Brunswick",
  NL: "Terre-Neuve-et-Labrador",
  NS: "Nouvelle-Écosse",
  NT: "Territoires du Nord-Ouest",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Île-du-Prince-Édouard",
  QC: "Québec",
  SK: "Saskatchewan",
  YT: "Yukon",
} as const;

export type ProvinceCode = keyof typeof PROVINCES;

export function isProvinceCode(value: unknown): value is ProvinceCode {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(PROVINCES, value);
}

/** Première lettre d'un code postal canadien → province (X est partagé par deux territoires). */
const POSTAL_LETTER: Record<string, ProvinceCode> = {
  A: "NL", B: "NS", C: "PE", E: "NB",
  G: "QC", H: "QC", J: "QC",
  K: "ON", L: "ON", M: "ON", N: "ON", P: "ON",
  R: "MB", S: "SK", T: "AB", V: "BC", Y: "YT",
};

export function provinceFromPostal(postal: string | null | undefined): ProvinceCode | null {
  const letter = (postal ?? "").trim().charAt(0).toUpperCase();
  return POSTAL_LETTER[letter] ?? null;
}

export type ChainKind = "supermarket" | "discount" | "warehouse" | "specialty";

export interface Chain {
  name: string;
  kind: ChainKind;
  website: string | null;
}

const c = (name: string, kind: ChainKind, website: string | null = null): Chain => ({ name, kind, website });

const WALMART = c("Walmart", "discount", "https://www.walmart.ca");
const COSTCO = c("Costco", "warehouse", "https://www.costco.ca");
const SUPERSTORE = c("Real Canadian Superstore", "discount", "https://www.realcanadiansuperstore.ca");
const SOBEYS = c("Sobeys", "supermarket", "https://www.sobeys.com");
const SAFEWAY = c("Safeway", "supermarket", "https://www.safeway.ca");
const SAVE_ON = c("Save-On-Foods", "supermarket", "https://www.saveonfoods.com");
const TNT = c("T&T Supermarket", "specialty", "https://www.tntsupermarket.com");
const ATLANTIC = c("Atlantic Superstore", "discount", "https://www.atlanticsuperstore.ca");
const FOODLAND = c("Foodland", "supermarket", "https://www.foodland.ca");
const NO_FRILLS = c("No Frills", "discount", "https://www.nofrills.ca");
const METRO = c("Metro", "supermarket", "https://www.metro.ca");

export const CHAINS_BY_PROVINCE: Record<ProvinceCode, Chain[]> = {
  QC: [
    METRO,
    c("IGA", "supermarket", "https://www.iga.net"),
    c("Maxi", "discount", "https://www.maxi.ca"),
    c("Super C", "discount", "https://www.superc.ca"),
    c("Provigo", "supermarket", "https://www.provigo.ca"),
    WALMART,
    COSTCO,
    c("Adonis", "specialty", "https://www.adonis.ca"),
    c("Marché Tradition", "supermarket"),
    c("Rachelle-Béry", "specialty"),
  ],
  ON: [
    c("Loblaws", "supermarket", "https://www.loblaws.ca"),
    NO_FRILLS,
    c("FreshCo", "discount", "https://www.freshco.com"),
    c("Food Basics", "discount", "https://www.foodbasics.ca"),
    METRO,
    SOBEYS,
    c("Farm Boy", "specialty", "https://www.farmboy.ca"),
    SUPERSTORE,
    c("Zehrs", "supermarket", "https://www.zehrs.ca"),
    c("Fortinos", "supermarket", "https://www.fortinos.ca"),
    WALMART,
    COSTCO,
    TNT,
  ],
  BC: [SAVE_ON, SAFEWAY, SUPERSTORE, c("Thrifty Foods", "supermarket", "https://www.thriftyfoods.com"), WALMART, COSTCO, TNT],
  AB: [SAFEWAY, SOBEYS, c("Calgary Co-op", "supermarket", "https://www.calgarycoop.com"), SUPERSTORE, SAVE_ON, WALMART, COSTCO, TNT, c("Freson Bros.", "supermarket", "https://www.fresonbros.com")],
  SK: [c("Co-op", "supermarket"), SAFEWAY, SUPERSTORE, SOBEYS, SAVE_ON, WALMART, COSTCO],
  MB: [SAFEWAY, SOBEYS, SUPERSTORE, c("Co-op", "supermarket"), WALMART, COSTCO],
  NB: [SOBEYS, ATLANTIC, FOODLAND, NO_FRILLS, WALMART, COSTCO],
  NS: [SOBEYS, ATLANTIC, FOODLAND, NO_FRILLS, WALMART, COSTCO],
  PE: [SOBEYS, ATLANTIC, FOODLAND, WALMART, COSTCO],
  NL: [SOBEYS, c("Dominion", "supermarket"), c("Colemans", "supermarket", "https://www.colemans.ca"), FOODLAND, WALMART, COSTCO],
  YT: [SUPERSTORE],
  NT: [SUPERSTORE, c("NorthMart", "supermarket", "https://www.northwest.ca"), c("Co-op", "supermarket")],
  NU: [c("NorthMart", "supermarket", "https://www.northwest.ca"), c("Co-op", "supermarket")],
};

export function chainsForProvince(province: ProvinceCode | null): Chain[] {
  return province ? CHAINS_BY_PROVINCE[province] : [];
}
