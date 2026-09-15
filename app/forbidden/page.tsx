import { SignOutButton } from "@clerk/nextjs";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Wordmark />
      <h1 className="text-3xl">accès réservé</h1>
      <p className="max-w-md text-sm text-dm-muted">
        cantera est réservé aux comptes @data-major.com. Déconnecte-toi et
        utilise ton adresse professionnelle.
      </p>
      <SignOutButton>
        <Button className="rounded-full lowercase">se déconnecter</Button>
      </SignOutButton>
    </main>
  );
}
