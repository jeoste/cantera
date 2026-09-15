import type { ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { requireRecruiter } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireRecruiter();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader userName={session.name} />
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
        {children}
      </div>
    </div>
  );
}
