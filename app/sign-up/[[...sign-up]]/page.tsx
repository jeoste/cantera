import { SignUp } from "@clerk/nextjs";
import { Wordmark } from "@/components/wordmark";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Wordmark />
      <p className="max-w-sm text-center text-sm text-dm-muted">
        Comptes réservés aux adresses @data-major.com
      </p>
      <SignUp />
    </main>
  );
}
