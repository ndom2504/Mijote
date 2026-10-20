import Link from "next/link";
import { currentUser } from "@/server/auth/current";
import { listFavorites } from "@/server/menus/service";
import { t } from "@/lib/i18n";
import { Photo } from "@/components/Shell";
import { FavoriteButton } from "@/components/RecipeTools";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  const favorites = await listFavorites(user.id, user.locale);
  return (
    <>
      <h1>{t(user.locale, "nav_favorites")}</h1>
      {favorites.length === 0 ? <p className="notice info">{t(user.locale, "empty_favorites")}</p> : null}
      <div className="meal-grid">
        {favorites.map((recipe) => (
          <article className="card" key={recipe.id}>
            <Photo src={recipe.photoUrl} />
            <div className="card-body">
              <h2>{recipe.name}</h2>
              <p className="meta">{recipe.prepMinutes + recipe.cookMinutes} min</p>
              <div className="actions">
                <Link className="btn btn-primary" href={`/recettes/${recipe.slug}`}>{t(user.locale, "see_recipe")}</Link>
                <FavoriteButton locale={user.locale} recipeId={recipe.id} favorite />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
