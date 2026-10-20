import { redirect } from "next/navigation";
import { currentUser } from "@/server/auth/current";
import { adminStats, listAiQueue, listErrors, listSources } from "@/server/admin/service";
import { AdminRecipeForm, ReviewButton } from "@/components/AdminPanel";
import { t } from "@/lib/i18n";

export default async function Page() {
  const user = await currentUser();
  if (!user) redirect("/connexion");
  if (user.role !== "admin") redirect("/aujourd-hui");
  const stats = await adminStats();
  const sources = await listSources();
  const errors = await listErrors();
  const queue = await listAiQueue();
  return (
    <>
      <h1>{t(user.locale, "admin")}</h1>
      <section>
        <h2>{t(user.locale, "stats")}</h2>
        <div className="cards">
          <article className="panel"><h3>{t(user.locale, "users")}</h3><p>{stats.users}</p></article>
          <article className="panel"><h3>{t(user.locale, "published")}</h3><p>{stats.recipes}</p></article>
          <article className="panel"><h3>{t(user.locale, "plans")}</h3><p>{stats.plans}</p></article>
          <article className="panel"><h3>{t(user.locale, "pending_ai")}</h3><p>{stats.aiPending}</p></article>
          <article className="panel"><h3>{t(user.locale, "errors")}</h3><p>{stats.errors}</p></article>
        </div>
      </section>
      <section>
        <h2>{t(user.locale, "sources")}</h2>
        {sources.map((source) => (
          <article className="panel" key={String(source.id)}>
            <h3>{String(source.name)}</h3>
            <p className="meta">{String(source.kind)} · {String(source.geographic_zone ?? "")} · {String(source.updated_on ?? "")}</p>
            <p>{String(source.notes ?? "")}</p>
            {source.url ? <p><a href={String(source.url)}>{String(source.url)}</a></p> : null}
          </article>
        ))}
      </section>
      <section>
        <h2>{t(user.locale, "journal")}</h2>
        {errors.length === 0 ? <p className="notice info">{t(user.locale, "no_notifications")}</p> : null}
        {errors.map((item) => (
          <article className="panel" key={item.id}>
            <p>{item.message}</p>
            <p className="meta">{item.context} · {item.created_at}</p>
          </article>
        ))}
      </section>
      <section>
        <h2>{t(user.locale, "pending_ai")}</h2>
        {queue.map((item) => (
          <article className="panel" key={item.id}>
            <p className="meta">{item.kind} · {item.created_at}</p>
            <p>{item.rejection_reason}</p>
            <pre>{item.output.slice(0, 400)}</pre>
            {!item.validated ? <ReviewButton locale={user.locale} id={item.id} /> : null}
          </article>
        ))}
      </section>
      <AdminRecipeForm locale={user.locale} />
    </>
  );
}
