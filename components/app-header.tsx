import type { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { Button } from "@/components/ui/button";

export function AppHeader({
  userName,
  notifications,
}: {
  userName: string;
  notifications: ReactNode;
}) {
  return (
    <header className="border-b-2 border-black bg-white">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Wordmark />
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button asChild variant="ghost" className="rounded-none lowercase">
            <Link href="/">pipeline</Link>
          </Button>
          {notifications}
          <Button asChild variant="ghost" className="rounded-none lowercase">
            <Link href="/maj">agent</Link>
          </Button>
          <Button asChild className="rounded-full lowercase">
            <Link href="/candidates/new">ajouter</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-none lowercase">
            <a href="/export">csv</a>
          </Button>
          <div className="ml-1 flex items-center gap-2 border-l border-black pl-3">
            <span className="hidden text-xs text-dm-muted sm:inline">
              {userName}
            </span>
            <UserButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
