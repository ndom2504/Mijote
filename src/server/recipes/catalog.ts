import { breakfast } from "@/server/recipes/breakfast";
import { dinner } from "@/server/recipes/dinner";
import { lunch } from "@/server/recipes/lunch";
import type { CatalogRecipe } from "@/server/recipes/builder";

export const catalog: CatalogRecipe[] = [...breakfast, ...lunch, ...dinner];

const slugs = new Set<string>();
for (const item of catalog) {
  if (slugs.has(item.slug)) throw new Error(`Doublon de recette : ${item.slug}`);
  slugs.add(item.slug);
}
