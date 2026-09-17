import Link from "next/link";
import { requireRecruiter } from "@/lib/auth";
import { listCandidates, listOwners } from "@/lib/candidates";
import { KanbanBoard } from "@/components/kanban-board";
import { PipelineFilters } from "@/components/pipeline-filters";

export const dynamic = "force-dynamic";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; owner?: string | string[] }>;
}) {
  await requireRecruiter();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : "";
  const ownerUserId = typeof params.owner === "string" ? params.owner : "";

  const [rows, owners] = await Promise.all([
    listCandidates({ query, ownerUserId: ownerUserId || undefined }),
    listOwners(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <p className="text-xs lowercase tracking-[0.18em] text-dm-slate">
          data-major ibérica
        </p>
        <h1 className="text-4xl sm:text-5xl">cantera</h1>
        <p className="max-w-2xl text-sm text-dm-muted">
          Glisse les profils entre colonnes. Colle un retour dans{" "}
          <Link href="/maj" className="underline">
            agent
          </Link>
          . Toute l’équipe @data-major.com peut modifier et supprimer.
        </p>
      </div>
      <PipelineFilters
        owners={owners}
        query={query}
        ownerUserId={ownerUserId}
      />
      <p className="text-xs text-dm-gray">{rows.length} profils</p>
      <KanbanBoard
        cards={rows.map(({ candidate, ownerName }) => ({
          id: candidate.id,
          fullName: candidate.fullName,
          currentTitle: candidate.currentTitle,
          currentCompany: candidate.currentCompany,
          locationRaw: candidate.locationRaw,
          status: candidate.status,
          ownerName,
          lastContactedAt: candidate.lastContactedAt?.toISOString() ?? null,
          isNew: candidate.isNew,
        }))}
      />
    </div>
  );
}
