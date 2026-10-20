/** Cuisine associée au plat dans le catalogue. Ce n'est pas une tendance locale mesurée. */
export const RECIPE_ORIGIN: Record<string, string> = {
  "gruau-erable-bleuets": "CA",
  "pain-dore": "CA",
  "bagel-concombre": "CA",
  "feves-au-lard": "CA",
  "soupe-aux-pois": "CA",
  "pate-chinois": "CA",
  "pate-chinois-lentilles": "CA",
  "tourtiere-porc": "CA",
  "saumon-erable": "CA",
  "poulet-erable-legumes": "CA",
  "mijote-racines": "CA",
  "galettes-sarrasin": "FR",
  minestrone: "IT",
  "lasagne-legumes": "IT",
  "pates-pesto": "IT",
  "spaghetti-lentilles": "IT",
  "tacos-haricots": "MX",
  "fajitas-poulet": "MX",
  "chili-haricots": "MX",
  "dal-lentilles": "IN",
  "curry-pois-chiches": "IN",
  "nouilles-arachide": "TH",
  "morue-tomates": "PT",
  "burger-dinde": "US",
  "casserole-macaroni": "US",
};

export function originOf(slug: string): string | null {
  return RECIPE_ORIGIN[slug] ?? null;
}
