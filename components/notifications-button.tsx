"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { NouveauBadge } from "@/components/nouveau-badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";
import type { CandidateStatus } from "@/drizzle/schema";

export type NotificationProfile = {
  id: string;
  fullName: string;
  currentTitle: string | null;
  currentCompany: string | null;
  status: CandidateStatus;
  createdAt: string;
};

export function NotificationsButton({
  profiles,
}: {
  profiles: NotificationProfile[];
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="ghost"
        className="rounded-none lowercase"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        notifications
        {profiles.length > 0 ? (
          <span className="ml-1.5 inline-flex min-w-5 items-center justify-center border border-black bg-dm-yellow px-1 text-[10px] text-dm-ink">
            {profiles.length}
          </span>
        ) : null}
      </Button>
      {open ? (
        <div className="absolute right-0 z-50 mt-1 w-[min(24rem,calc(100vw-2rem))] border border-black bg-white shadow-[4px_4px_0_0_#000]">
          <div className="border-b-2 border-black px-3 py-2">
            <p className="text-sm font-medium">dernière fournée</p>
            <p className="text-xs text-dm-muted">
              Profils ajoutés il y a moins de 24 h. Badge « nouveau » le temps
              d’une journée.
            </p>
          </div>
          {profiles.length === 0 ? (
            <p className="px-3 py-6 text-sm text-dm-gray">
              Aucun nouveau profil pour le moment.
            </p>
          ) : (
            <ul className="max-h-[70vh] overflow-y-auto">
              {profiles.map((profile) => (
                <li key={profile.id} className="border-b border-black last:border-b-0">
                  <Link
                    href={`/candidates/${profile.id}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-3 hover:bg-dm-yellow/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{profile.fullName}</p>
                      <NouveauBadge />
                    </div>
                    <p className="mt-1 text-xs text-dm-muted">
                      {[profile.currentTitle, profile.currentCompany]
                        .filter(Boolean)
                        .join(" · ") || "Titre à préciser"}
                    </p>
                    <p className="mt-1 text-[11px] lowercase text-dm-slate">
                      {STATUS_LABELS[profile.status]} ·{" "}
                      {formatDateTime(profile.createdAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
