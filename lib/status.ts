import type { CandidateStatus } from "@/drizzle/schema";

export const KANBAN_COLUMNS = [
  {
    id: "to_contact",
    label: "À contacter",
    statuses: ["new", "proposed", "to_contact"] as CandidateStatus[],
  },
  {
    id: "contacted",
    label: "Contacté",
    statuses: ["contacted", "no_reply"] as CandidateStatus[],
  },
  {
    id: "replied",
    label: "Répondu",
    statuses: ["replied"] as CandidateStatus[],
  },
  {
    id: "interview",
    label: "Entretien",
    statuses: ["interview"] as CandidateStatus[],
  },
  {
    id: "offer",
    label: "Offre",
    statuses: ["offer", "hired"] as CandidateStatus[],
  },
  {
    id: "closed",
    label: "Clos",
    statuses: [
      "rejected_by_us",
      "candidate_declined",
      "too_expensive",
      "wrong_fit",
      "blacklisted",
      "on_hold",
    ] as CandidateStatus[],
  },
] as const;

export const STATUS_LABELS: Record<CandidateStatus, string> = {
  new: "Nouveau",
  proposed: "Proposé",
  to_contact: "À contacter",
  contacted: "Contacté",
  replied: "A répondu",
  interview: "Entretien",
  offer: "Offre",
  hired: "Embauché",
  rejected_by_us: "Refusé par nous",
  no_reply: "Sans réponse",
  candidate_declined: "Pas intéressé",
  on_hold: "En pause",
  blacklisted: "Blacklisté",
  too_expensive: "Trop cher",
  wrong_fit: "Hors brief",
};

export const QUICK_ACTIONS: {
  label: string;
  toStatus: CandidateStatus;
  summary: string;
  eventType:
    | "status_changed"
    | "contacted"
    | "reply_received"
    | "interview"
    | "colleague_feedback";
}[] = [
  {
    label: "Contacté",
    toStatus: "contacted",
    summary: "Message envoyé au candidat",
    eventType: "contacted",
  },
  {
    label: "A répondu",
    toStatus: "replied",
    summary: "Réponse reçue",
    eventType: "reply_received",
  },
  {
    label: "Intéressé → entretien",
    toStatus: "interview",
    summary: "Candidat intéressé, entretien à préparer",
    eventType: "interview",
  },
  {
    label: "Pas intéressé",
    toStatus: "candidate_declined",
    summary: "Candidat pas intéressé",
    eventType: "colleague_feedback",
  },
  {
    label: "Trop cher",
    toStatus: "too_expensive",
    summary: "Écart salarial / trop cher",
    eventType: "colleague_feedback",
  },
];

export function columnForStatus(status: CandidateStatus) {
  return KANBAN_COLUMNS.find((column) =>
    (column.statuses as readonly CandidateStatus[]).includes(status),
  );
}
