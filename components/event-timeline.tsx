import type { CandidateEvent } from "@/drizzle/schema";
import { formatDateTime } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/status";

const EVENT_LABELS: Record<string, string> = {
  discovered: "Découvert",
  proposed_in_digest: "Proposé",
  status_changed: "Statut",
  contacted: "Contact",
  reply_received: "Réponse",
  interview: "Entretien",
  colleague_feedback: "Retour métier",
  note: "Note",
  salary_update: "Salaire",
  flag_added: "Flag",
  import: "Import",
};

export function EventTimeline({ events }: { events: CandidateEvent[] }) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-dm-muted">Aucun événement pour l’instant.</p>
    );
  }

  return (
    <ol className="space-y-0 border-l border-black">
      {events.map((event) => (
        <li key={event.id} className="relative pl-6 pb-6 last:pb-0">
          <span className="absolute top-1.5 -left-[5px] size-2.5 rounded-full bg-dm-yellow ring-2 ring-black" />
          <p className="text-xs lowercase tracking-wide text-dm-slate">
            {EVENT_LABELS[event.type] ?? event.type} · {formatDateTime(event.at)}
          </p>
          <p className="mt-1 text-sm">{event.summary}</p>
          <p className="mt-1 text-xs text-dm-gray">
            {event.actorName}
            {event.fromStatus && event.toStatus
              ? ` · ${STATUS_LABELS[event.fromStatus]} → ${STATUS_LABELS[event.toStatus]}`
              : null}
          </p>
        </li>
      ))}
    </ol>
  );
}
