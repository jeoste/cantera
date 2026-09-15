"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRecruiter } from "@/lib/auth";
import {
  addCandidateNote,
  assignOwner,
  changeCandidateStatus,
  createCandidate,
} from "@/lib/candidates";
import type { CandidateStatus } from "@/drizzle/schema";

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
