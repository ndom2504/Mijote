"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="contenu" className="wrap main">
      <h1>Mijoté</h1>
      <p className="notice error" role="alert">Une erreur est survenue. Les détails techniques restent dans le journal du serveur.</p>
      <button className="btn btn-primary" type="button" onClick={() => reset()}>Réessayer</button>
    </main>
  );
}
