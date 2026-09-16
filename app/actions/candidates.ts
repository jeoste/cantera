"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRecruiter } from "@/lib/auth";
import {
  addCandidateNote,
  archiveCandidate,
  assignOwner,
  changeCandidateStatus,
  createCandidate,
  updateCandidateProfile,
} from "@/lib/candidates";
import type { CandidateStatus } from "@/drizzle/schema";
import { eventTypeForStatus, STATUS_LABELS } from "@/lib/status";
import { ingestAgentPayload } from "@/lib/agent/ingest";

export async function createCandidateAction(formData: FormData) {
  const session = await requireRecruiter();
  const linkedinUrl = String(formData.get("linkedinUrl") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();

  if (!fullName) {
    throw new Error("Le nom est obligatoire.");
  }

  const result = await createCandidate({
    linkedinUrl,
    fullName,
    currentTitle: String(formData.get("currentTitle") ?? ""),
    currentCompany: String(formData.get("currentCompany") ?? ""),
    locationRaw: String(formData.get("locationRaw") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    ownerUserId: session.local.id,
    actorName: session.name,
    actorEmail: session.email,
  });

  revalidatePath("/");
  redirect(`/candidates/${result.candidate.id}`);
}

export async function changeStatusAction(formData: FormData) {
  const session = await requireRecruiter();
  const candidateId = String(formData.get("candidateId") ?? "");
  const toStatus = String(formData.get("toStatus") ?? "") as CandidateStatus;
  const summary = String(formData.get("summary") ?? "").trim();
  const eventType = String(formData.get("eventType") ?? "status_changed") as
    | "status_changed"
    | "contacted"
    | "reply_received"
    | "interview"
    | "colleague_feedback";

  await changeCandidateStatus({
    candidateId,
    toStatus,
    summary: summary || `Statut → ${toStatus}`,
    eventType,
    actorName: session.name,
    actorEmail: session.email,
    actorType: "human",
  });

  revalidatePath("/");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function addNoteAction(formData: FormData) {
  const session = await requireRecruiter();
  const candidateId = String(formData.get("candidateId") ?? "");
  const summary = String(formData.get("summary") ?? "").trim();
  if (!summary) return;

  await addCandidateNote({
    candidateId,
    summary,
    actorName: session.name,
    actorEmail: session.email,
  });

  revalidatePath("/");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function assignOwnerAction(formData: FormData) {
  await requireRecruiter();
  const candidateId = String(formData.get("candidateId") ?? "");
  const ownerUserId = String(formData.get("ownerUserId") ?? "") || null;

  await assignOwner({ candidateId, ownerUserId });
  revalidatePath("/");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function moveCandidateAction(input: {
  candidateId: string;
  toStatus: CandidateStatus;
  note?: string;
}) {
  const session = await requireRecruiter();
  const summary =
    input.note?.trim() || `Déplacé vers ${STATUS_LABELS[input.toStatus]}`;

  await changeCandidateStatus({
    candidateId: input.candidateId,
    toStatus: input.toStatus,
    summary,
    eventType: eventTypeForStatus(input.toStatus),
    actorName: session.name,
    actorEmail: session.email,
    actorType: "human",
  });

  revalidatePath("/");
  revalidatePath(`/candidates/${input.candidateId}`);
}

export async function updateCandidateAction(formData: FormData) {
  const session = await requireRecruiter();
  const candidateId = String(formData.get("candidateId") ?? "");
  const toStatus = String(formData.get("status") ?? "") as CandidateStatus;
  const previousStatus = String(formData.get("previousStatus") ?? "");
  const redFlags = String(formData.get("redFlags") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  await updateCandidateProfile({
    candidateId,
    fullName: String(formData.get("fullName") ?? ""),
    linkedinUrl: String(formData.get("linkedinUrl") ?? ""),
    currentTitle: String(formData.get("currentTitle") ?? ""),
    currentCompany: String(formData.get("currentCompany") ?? ""),
    locationRaw: String(formData.get("locationRaw") ?? ""),
    headline: String(formData.get("headline") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    notesMode: "replace",
    salaryRisk: String(formData.get("salaryRisk") ?? ""),
    remoteFlag: String(formData.get("remoteFlag") ?? ""),
    redFlags,
    actorName: session.name,
    actorEmail: session.email,
    actorType: "human",
  });

  if (toStatus && toStatus !== previousStatus) {
    await changeCandidateStatus({
      candidateId,
      toStatus,
      summary: `Statut → ${STATUS_LABELS[toStatus]}`,
      eventType: eventTypeForStatus(toStatus),
      actorName: session.name,
      actorEmail: session.email,
      actorType: "human",
    });
  }

  revalidatePath("/");
  revalidatePath(`/candidates/${candidateId}`);
}

export async function archiveCandidateAction(formData: FormData) {
  const session = await requireRecruiter();
  const candidateId = String(formData.get("candidateId") ?? "");
  await archiveCandidate({
    candidateId,
    actorName: session.name,
    actorEmail: session.email,
    actorType: "human",
  });
  revalidatePath("/");
  redirect("/");
}

export async function ingestUpdateAction(formData: FormData) {
  const session = await requireRecruiter();
  const text = String(formData.get("text") ?? "");
  const createIfMissing = formData.get("createIfMissing") === "on";

  const result = await ingestAgentPayload({
    text,
    createIfMissing,
    actor: {
      name: session.name,
      email: session.email,
      type: "human",
    },
  });

  revalidatePath("/");
  return result;
}
