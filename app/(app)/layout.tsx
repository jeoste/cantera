import { Suspense, type ReactNode } from "react";
import { AppHeader } from "@/components/app-header";
import { NotificationsButton } from "@/components/notifications-button";
import { requireRecruiter } from "@/lib/auth";
import { listFreshCandidates } from "@/lib/candidates";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await requireRecruiter();

  return (
    <div className="flex min-h-full flex-col">
      <AppHeader
        userName={session.name}
        notifications={
          <Suspense fallback={<NotificationsButton profiles={[]} />}>
            <FreshNotifications />
          </Suspense>
        }
      />
      <div className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6">
        {children}
      </div>
    </div>
  );
}

async function FreshNotifications() {
  const fresh = await listFreshCandidates();
  return (
    <NotificationsButton
      profiles={fresh.map((candidate) => ({
        id: candidate.id,
        fullName: candidate.fullName,
        currentTitle: candidate.currentTitle,
        currentCompany: candidate.currentCompany,
        status: candidate.status,
        createdAt: candidate.createdAt.toISOString(),
      }))}
    />
  );
}
