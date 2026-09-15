import { SignIn } from "@clerk/nextjs";
import { Wordmark } from "@/components/wordmark";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4">
      <Wordmark />
      <SignIn />
    </main>
  );
}
