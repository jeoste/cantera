import {
  changeCandidateStatus,
  createCandidate,
  loadMatchIndex,
  matchCandidate,
  updateCandidateProfile,
  type MatchIndex,
} from "@/lib/candidates";
import { eventTypeForStatus, STATUS_LABELS } from "@/lib/status";
import { normalizeLinkedinUrl } from "@/lib/linkedin";
import type {
  AgentActor,
  AgentApplyResult,
  AgentUpdateInput,
} from "@/lib/agent/types";

function profileFields(update: AgentUpdateInput, includeNotes: boolean) {
  return {
    fullName: update.fullName,
    linkedinUrl: update.linkedinUrl,
    currentTitle: update.currentTitle,
    currentCompany: update.currentCompany,
    locationRaw: update.locationRaw,
    headline: update.headline,
    notes: includeNotes ? update.notes : undefined,
    salaryRisk: update.salaryRisk,
    remoteFlag: update.remoteFlag,
    redFlags: update.redFlags,
  };
}

function hasProfilePatch(update: AgentUpdateInput, includeNotes: boolean) {
  const fields = profileFields(update, includeNotes);
  return Object.entries(fields).some(([key, value]) => {
    if (key === "fullName" || key === "linkedinUrl") return false;
    return value !== undefined;
  });
}

export async function applyAgentUpdate(
  update: AgentUpdateInput,
  actor: AgentActor,
  batchId?: string,
  index?: MatchIndex,
): Promise<AgentApplyResult> {
  const matched = index
    ? index.match({
        id: update.id,
        linkedinUrl: update.linkedinUrl,
        fullName: update.fullName,
      })
    : await matchCandidate({
        id: update.id,
        linkedinUrl: update.linkedinUrl,
        fullName: update.fullName,
      });

  if (matched.match === "ambiguous") {
    return {
      action: "skipped",
      reason: `Plusieurs profils pour « ${update.fullName} ». Précise l’URL LinkedIn.`,
      fullName: update.fullName,
      linkedinUrl: update.linkedinUrl,
      changes: [],
    };
  }

  if (!matched.candidate) {
    const canCreate =
      update.createIfMissing !== false &&
      !!update.fullName?.trim() &&
      !!update.linkedinUrl;
    if (!canCreate) {
      return {
        action: "skipped",
        reason: `Aucun profil pour ${update.fullName ?? update.linkedinUrl ?? update.id ?? "cette entrée"}. Il faut fullName + linkedinUrl pour créer.`,
        fullName: update.fullName,
        linkedinUrl: update.linkedinUrl,
        changes: [],
      };
    }

    const created = await createCandidate({
      linkedinUrl: update.linkedinUrl!,
      fullName: update.fullName!,
      currentTitle: update.currentTitle,
      currentCompany: update.currentCompany,
      locationRaw: update.locationRaw,
      headline: update.headline,
      notes: update.notes,
      actorName: actor.name,
      actorEmail: actor.email,
      actorType: actor.type,
      sourceFirst: "other",
      batchId,
    });

    if (update.status && created.candidate.status !== update.status) {
      await changeCandidateStatus({
        candidateId: created.candidate.id,
        toStatus: update.status,
        summary: update.notes?.trim() || `Statut → ${STATUS_LABELS[update.status]}`,
        eventType: eventTypeForStatus(update.status),
        actorName: actor.name,
        actorEmail: actor.email,
        actorType: actor.type,
      });
    }

    index?.add({
      id: created.candidate.id,
      fullName: created.candidate.fullName,
      linkedinUrl: created.candidate.linkedinUrl,
      status: update.status ?? created.candidate.status,
      archivedAt: null,
    });

    return {
      action: created.created ? "created" : "updated",
      candidateId: created.candidate.id,
      fullName: created.candidate.fullName,
      linkedinUrl: created.candidate.linkedinUrl,
      changes: created.created ? ["créé"] : ["déjà présent"],
    };
  }

  const candidate = matched.candidate;
  const changes: string[] = [];
  const includeNotes = !update.status;

  if (
    hasProfilePatch(update, includeNotes) ||
    (update.fullName && update.fullName !== candidate.fullName) ||
    (update.linkedinUrl && update.linkedinUrl !== candidate.linkedinUrl)
  ) {
    await updateCandidateProfile({
      candidateId: candidate.id,
      ...profileFields(update, includeNotes),
      notesMode: "append",
      actorName: actor.name,
      actorEmail: actor.email,
      actorType: actor.type,
      summary: includeNotes ? update.notes?.trim() : undefined,
    });
    changes.push("profil");
    index?.patch(candidate.id, {
      fullName: update.fullName,
      linkedinUrl: update.linkedinUrl
        ? normalizeLinkedinUrl(update.linkedinUrl)
        : undefined,
    });
  }

  if (update.status && update.status !== candidate.status) {
    await changeCandidateStatus({
      candidateId: candidate.id,
      toStatus: update.status,
      summary:
        update.notes?.trim() ||
        `Statut → ${STATUS_LABELS[update.status]}`,
      eventType: eventTypeForStatus(update.status),
      actorName: actor.name,
      actorEmail: actor.email,
      actorType: actor.type,
    });
    changes.push(`statut:${STATUS_LABELS[update.status]}`);
    index?.patch(candidate.id, { status: update.status });
  } else if (update.notes?.trim() && !hasProfilePatch(update, true)) {
    await updateCandidateProfile({
      candidateId: candidate.id,
      notes: update.notes,
      notesMode: "append",
      actorName: actor.name,
      actorEmail: actor.email,
      actorType: actor.type,
      summary: update.notes,
    });
    changes.push("note");
  }

  if (changes.length === 0) {
    return {
      action: "unchanged",
      candidateId: candidate.id,
      fullName: candidate.fullName,
      linkedinUrl: candidate.linkedinUrl,
      changes: [],
    };
  }

  return {
    action: "updated",
    candidateId: candidate.id,
    fullName: candidate.fullName,
    linkedinUrl: candidate.linkedinUrl,
    changes,
  };
}

export async function applyAgentUpdates(
  updates: AgentUpdateInput[],
  actor: AgentActor,
) {
  const batchId = crypto.randomUUID();
  const index = updates.length > 1 ? await loadMatchIndex() : undefined;
  const results: AgentApplyResult[] = [];
  for (const update of updates) {
    results.push(await applyAgentUpdate(update, actor, batchId, index));
  }
  return results;
}
