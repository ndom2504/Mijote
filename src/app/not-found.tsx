import Link from "next/link";

export default function NotFound() {
  return (
    <main id="contenu" className="wrap main">
      <h1>Page introuvable</h1>
      <p><Link href="/">Retour à Mijoté</Link></p>
    </main>
  );
}
