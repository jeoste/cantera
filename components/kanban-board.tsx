import Link from "next/link";
import type { Candidate, User } from "@/drizzle/schema";
import { formatDate } from "@/lib/format";
import { KANBAN_COLUMNS, STATUS_LABELS } from "@/lib/status";

type Row = {
  candidate: Candidate;
  ownerName: string | null;
};

export function KanbanBoard({
  rows,
}: {
  rows: Row[];
  owners?: User[];
}) {
  return (
    <div className="flex min-h-[70vh] gap-3 overflow-x-auto pb-6">
      {KANBAN_COLUMNS.map((column) => {
        const cards = rows.filter((row) =>
          (column.statuses as readonly string[]).includes(row.candidate.status),
        );
        return (
          <section
            key={column.id}
            className="flex w-[280px] shrink-0 flex-col border border-black bg-white"
          >
            <header className="flex items-baseline justify-between border-b-2 border-black px-3 py-2">
              <h2 className="text-lg">{column.label}</h2>
              <span className="text-xs text-dm-muted">{cards.length}</span>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {cards.length === 0 ? (
                <p className="px-1 py-6 text-xs text-dm-gray">Aucun profil.</p>
              ) : (
                cards.map(({ candidate, ownerName }) => (
                  <Link
                    key={candidate.id}
                    href={`/candidates/${candidate.id}`}
                    className="block border border-black bg-dm-paper p-3 transition-colors hover:bg-dm-yellow/40"
                  >
                    <p className="font-medium leading-snug">
                      {candidate.fullName}
                    </p>
                    <p className="mt-1 text-xs text-dm-muted">
                      {[candidate.currentTitle, candidate.currentCompany]
                        .filter(Boolean)
                        .join(" · ") || "Titre à préciser"}
                    </p>
                    {candidate.locationRaw ? (
                      <p className="mt-1 text-xs text-dm-gray">
                        {candidate.locationRaw}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] lowercase text-dm-slate">
                      <span>{STATUS_LABELS[candidate.status]}</span>
                      <span>
                        {ownerName ?? "sans owner"}
                        {candidate.lastContactedAt
                          ? ` · ${formatDate(candidate.lastContactedAt)}`
                          : ""}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
