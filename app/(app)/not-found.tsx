import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="text-4xl">profil introuvable</h1>
      <p className="mt-2 text-sm text-dm-muted">
        Ce candidat n’existe pas ou a été archivé.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm text-dm-slate underline">
        Retour au pipeline
      </Link>
    </div>
  );
}
