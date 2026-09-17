import type { ReactNode } from "react";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { assignOwnerAction } from "@/app/actions/candidates";
import { CandidateEditForm } from "@/components/candidate-edit-form";
import { DeleteCandidateButton } from "@/components/delete-candidate-button";
import { NouveauBadge } from "@/components/nouveau-badge";
import { EventTimeline } from "@/components/event-timeline";
import { NoteForm } from "@/components/note-form";
import { StatusActions } from "@/components/status-actions";
import { requireRecruiter } from "@/lib/auth";
import { getCandidate, listOwners, markCandidateSeen } from "@/lib/candidates";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";

export default async function CandidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRecruiter();
  const { id } = await params;
  const [detail, owners] = await Promise.all([getCandidate(id), listOwners()]);
  if (!detail) notFound();

  const { candidate, ownerName, events } = detail;

  if (candidate.isNew) {
    after(async () => {
      await markCandidateSeen(candidate.id);
      revalidatePath("/", "layout");
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <section className="space-y-6">
        <div>
          <p className="text-xs lowercase tracking-[0.18em] text-dm-slate">
            fiche candidat
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-4xl normal-case sm:text-5xl">
              {candidate.fullName}
            </h1>
            {candidate.isNew ? <NouveauBadge /> : null}
          </div>
          <p className="mt-2 text-sm text-dm-muted">
            {[candidate.currentTitle, candidate.currentCompany]
              .filter(Boolean)
              .join(" · ") || "Profil LinkedIn"}
          </p>
        </div>

        <dl className="grid gap-3 border border-black bg-white p-5 text-sm sm:grid-cols-2">
          <Item label="statut">{STATUS_LABELS[candidate.status]}</Item>
          <Item label="owner">{ownerName ?? "non assigné"}</Item>
          <Item label="lieu">{candidate.locationRaw ?? "—"}</Item>
          <Item label="dernier contact">
            {formatDateTime(candidate.lastContactedAt)}
          </Item>
          <Item label="LinkedIn">
            <a
              href={candidate.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-dm-slate underline"
            >
              {candidate.linkedinUrl}
            </a>
          </Item>
          <Item label="source">{candidate.sourceFirst.replaceAll("_", " ")}</Item>
          {candidate.redFlags.length > 0 ? (
            <Item label="flags">{candidate.redFlags.join(", ")}</Item>
          ) : null}
          {candidate.salaryRisk ? (
            <Item label="risque salaire">{candidate.salaryRisk}</Item>
          ) : null}
          {candidate.remoteFlag ? (
            <Item label="remote">{candidate.remoteFlag}</Item>
          ) : null}
        </dl>

        {candidate.headline ? (
          <p className="border-l-4 border-dm-yellow pl-3 text-sm">
            {candidate.headline}
          </p>
        ) : null}

        {candidate.notes ? (
          <div className="border border-black bg-white p-5">
            <h2 className="text-xl">notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm">{candidate.notes}</p>
          </div>
        ) : null}

        <div className="border border-black bg-white p-5">
          <h2 className="mb-4 text-xl">actions rapides</h2>
          <StatusActions candidateId={candidate.id} />
        </div>

        <div className="border border-black bg-white p-5">
          <h2 className="mb-4 text-xl">modifier le profil</h2>
          <p className="mb-4 text-xs text-dm-muted">
            Toute personne @data-major.com peut modifier ou supprimer.
          </p>
          <CandidateEditForm candidate={candidate} />
        </div>

        <div className="border border-black bg-white p-5">
          <h2 className="mb-4 text-xl">retour / note</h2>
          <NoteForm candidateId={candidate.id} />
        </div>
      </section>

      <aside className="space-y-6">
        <form
          action={assignOwnerAction}
          className="border border-black bg-white p-5"
        >
          <h2 className="mb-3 text-xl">owner</h2>
          <input type="hidden" name="candidateId" value={candidate.id} />
          <select
            name="ownerUserId"
            defaultValue={candidate.ownerUserId ?? ""}
            className="h-9 w-full border border-black bg-dm-paper px-3 text-sm"
          >
            <option value="">Non assigné</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="mt-3 rounded-full bg-dm-teal px-4 py-1.5 text-sm lowercase text-dm-paper"
          >
            assigner
          </button>
        </form>

        <div className="border border-black bg-white p-5">
          <h2 className="mb-3 text-xl">supprimer</h2>
          <p className="mb-3 text-xs text-dm-muted">
            Retire le profil du pipeline. Accessible à toute l’équipe.
          </p>
          <DeleteCandidateButton
            candidateId={candidate.id}
            fullName={candidate.fullName}
          />
        </div>

        <div className="border border-black bg-white p-5">
          <h2 className="mb-4 text-xl">historique</h2>
          <EventTimeline events={events} />
        </div>
      </aside>
    </div>
  );
}

function Item({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs lowercase tracking-wide text-dm-gray">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
