import type { Contains, Locale } from "@/lib/constants";
import { proteinKey } from "@/server/recommendations/engine";
import { normalizeText } from "@/lib/text";

export function foodMarkers(contains: Contains, hasProduce: boolean, names: string[], locale: Locale): string[] {
  const joined = names.map((name) => normalizeText(name)).join(" ");
  const grains = /\b(avoine|quinoa|orge)\b/.test(joined);
  const tofu = /\btofu\b/.test(joined);
  const protein = proteinKey(contains);
  if (locale === "en") {
    const lines = ["Measured nutrition values: unavailable."];
    if (hasProduce) lines.push("This recipe includes fruit or vegetables.");
    if (tofu) lines.push("Protein source in the ingredient list: tofu.");
    else if (protein === "legume") lines.push("Protein source in the ingredient list: legumes.");
    else if (protein === "fish") lines.push("Protein source in the ingredient list: fish or shellfish.");
    else if (protein === "poultry" || protein === "pork" || protein === "beef") lines.push("Protein source in the ingredient list: meat or poultry.");
    else if (protein === "egg") lines.push("Protein source in the ingredient list: eggs.");
    else if (protein === "dairy") lines.push("Protein source in the ingredient list: dairy.");
    if (grains || contains.legume) lines.push("Oats, whole grains or legumes in this recipe usually contribute fibre. No amount was measured.");
    return lines;
  }
  const lines = ["Valeurs nutritionnelles mesurées : non disponibles."];
  if (hasProduce) lines.push("Cette recette contient des fruits ou des légumes.");
  if (tofu) lines.push("Source de protéines selon les ingrédients : tofu.");
  else if (protein === "legume") lines.push("Source de protéines selon les ingrédients : légumineuses.");
  else if (protein === "fish") lines.push("Source de protéines selon les ingrédients : poisson ou crustacés.");
  else if (protein === "poultry" || protein === "pork" || protein === "beef") lines.push("Source de protéines selon les ingrédients : viande ou volaille.");
  else if (protein === "egg") lines.push("Source de protéines selon les ingrédients : œufs.");
  else if (protein === "dairy") lines.push("Source de protéines selon les ingrédients : produit laitier.");
  if (grains || contains.legume) lines.push("L'avoine, les céréales ou les légumineuses de cette recette contribuent habituellement aux fibres. Aucune quantité n'a été mesurée.");
  return lines;
}
