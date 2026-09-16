import { and, desc, eq, gte, ilike, isNull, or, sql } from "drizzle-orm";
import {
  candidateEvents,
  candidates,
  users,
  type CandidateStatus,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";
import { freshSince } from "@/lib/fresh";
import { linkedinSlugFromUrl, normalizeLinkedinUrl } from "@/lib/linkedin";

export async function listCandidates(filters: {
  query?: string;
  ownerUserId?: string;
}) {
  const db = getDb();
  const conditions = [isNull(candidates.archivedAt)];

  if (filters.ownerUserId) {
    conditions.push(eq(candidates.ownerUserId, filters.ownerUserId));
  }

  if (filters.query?.trim()) {
    const q = `%${filters.query.trim()}%`;
    conditions.push(
      or(
        ilike(candidates.fullName, q),
        ilike(candidates.linkedinUrl, q),
        ilike(candidates.currentCompany, q),
        ilike(candidates.currentTitle, q),
      )!,
    );
  }

  return db
    .select({
      candidate: candidates,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(candidates)
    .leftJoin(users, eq(candidates.ownerUserId, users.id))
    .where(and(...conditions))
    .orderBy(desc(candidates.updatedAt));
}

export async function listFreshCandidates() {
  return getDb()
    .select({
      candidate: candidates,
      ownerName: users.name,
    })
    .from(candidates)
    .leftJoin(users, eq(candidates.ownerUserId, users.id))
    .where(
      and(isNull(candidates.archivedAt), gte(candidates.createdAt, freshSince())),
    )
    .orderBy(desc(candidates.createdAt));
}

export async function listOwners() {
  return getDb().select().from(users).orderBy(users.name);
}

export async function getCandidate(id: string) {
  const db = getDb();
  const [row] = await db
    .select({
      candidate: candidates,
      ownerName: users.name,
      ownerEmail: users.email,
    })
    .from(candidates)
    .leftJoin(users, eq(candidates.ownerUserId, users.id))
    .where(eq(candidates.id, id))
    .limit(1);

  if (!row) return null;

  const events = await db
    .select()
    .from(candidateEvents)
    .where(eq(candidateEvents.candidateId, id))
    .orderBy(desc(candidateEvents.at));

  return { ...row, events };
}

export async function findByLinkedinUrl(linkedinUrl: string) {
  const normalized = normalizeLinkedinUrl(linkedinUrl);
  const db = getDb();
  const [row] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.linkedinUrl, normalized))
    .limit(1);
  return row ?? null;
}

export async function createCandidate(input: {
  linkedinUrl: string;
  fullName: string;
  currentTitle?: string;
  currentCompany?: string;
  locationRaw?: string;
  headline?: string;
  notes?: string;
  ownerUserId?: string | null;
  actorName: string;
  actorEmail: string;
  actorType?: "human" | "agent" | "system";
  sourceFirst?: "linkedin_search" | "inbound_job_post" | "referral" | "manual" | "other";
}) {
  const db = getDb();
  const linkedinUrl = normalizeLinkedinUrl(input.linkedinUrl);
  const [existing] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.linkedinUrl, linkedinUrl))
    .limit(1);
  if (existing) {
    return { candidate: existing, created: false as const };
  }

  const now = new Date();
  const [candidate] = await db
    .insert(candidates)
    .values({
      linkedinUrl,
      linkedinSlug: linkedinSlugFromUrl(linkedinUrl),
      fullName: input.fullName.trim(),
      currentTitle: emptyToNull(input.currentTitle),
      currentCompany: emptyToNull(input.currentCompany),
      locationRaw: emptyToNull(input.locationRaw),
      headline: emptyToNull(input.headline),
      notes: emptyToNull(input.notes),
      ownerUserId: input.ownerUserId || null,
      status: "to_contact",
      sourceFirst: input.sourceFirst ?? "manual",
      doNotPropose: false,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .returning();

  await db.insert(candidateEvents).values({
    candidateId: candidate.id,
    type: "discovered",
    actorType: input.actorType ?? "human",
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    toStatus: "to_contact",
    summary: `Candidat ajouté manuellement : ${candidate.fullName}`,
    payload: { source: "manual" },
  });

  return { candidate, created: true as const };
}

export async function changeCandidateStatus(input: {
  candidateId: string;
  toStatus: CandidateStatus;
  summary: string;
  eventType:
    | "status_changed"
    | "contacted"
    | "reply_received"
    | "interview"
    | "colleague_feedback"
    | "note";
  actorName: string;
  actorEmail: string;
  actorType?: "human" | "agent" | "system";
  payload?: Record<string, unknown>;
}) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, input.candidateId))
    .limit(1);
  if (!current) {
    throw new Error("Candidat introuvable.");
  }
  if (current.status === input.toStatus) {
    return current;
  }

  const now = new Date();

  await db
    .update(candidates)
    .set({
      status: input.toStatus,
      updatedAt: now,
      lastSeenAt: now,
      lastContactedAt:
        input.toStatus === "contacted" || input.eventType === "contacted"
          ? now
          : current.lastContactedAt,
      doNotPropose: true,
    })
    .where(eq(candidates.id, input.candidateId));

  await db.insert(candidateEvents).values({
    candidateId: input.candidateId,
    type: input.eventType,
    actorType: input.actorType ?? "human",
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    fromStatus: current.status,
    toStatus: input.toStatus,
    summary: input.summary,
    payload: input.payload ?? {},
    channel: input.eventType === "contacted" ? "linkedin" : null,
  });
}

export async function addCandidateNote(input: {
  candidateId: string;
  summary: string;
  actorName: string;
  actorEmail: string;
  actorType?: "human" | "agent" | "system";
}) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, input.candidateId))
    .limit(1);
  if (!current) {
    throw new Error("Candidat introuvable.");
  }

  await db
    .update(candidates)
    .set({
      notes: current.notes
        ? `${current.notes}\n\n${input.summary}`
        : input.summary,
      updatedAt: new Date(),
    })
    .where(eq(candidates.id, input.candidateId));

  await db.insert(candidateEvents).values({
    candidateId: input.candidateId,
    type: "note",
    actorType: input.actorType ?? "human",
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    summary: input.summary,
    payload: {},
  });
}

export async function assignOwner(input: {
  candidateId: string;
  ownerUserId: string | null;
}) {
  await getDb()
    .update(candidates)
    .set({ ownerUserId: input.ownerUserId, updatedAt: new Date() })
    .where(eq(candidates.id, input.candidateId));
}

export async function listCandidatesForExport() {
  return getDb()
    .select({
      fullName: candidates.fullName,
      linkedinUrl: candidates.linkedinUrl,
      status: candidates.status,
      currentTitle: candidates.currentTitle,
      currentCompany: candidates.currentCompany,
      locationRaw: candidates.locationRaw,
      lastContactedAt: candidates.lastContactedAt,
      ownerName: users.name,
      notes: candidates.notes,
      redFlags: candidates.redFlags,
      doNotPropose: candidates.doNotPropose,
    })
    .from(candidates)
    .leftJoin(users, eq(candidates.ownerUserId, users.id))
    .where(isNull(candidates.archivedAt))
    .orderBy(sql`${candidates.fullName} asc`);
}

export function foldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function listCandidateCatalog() {
  return getDb()
    .select({
      id: candidates.id,
      fullName: candidates.fullName,
      linkedinUrl: candidates.linkedinUrl,
      status: candidates.status,
      currentTitle: candidates.currentTitle,
      currentCompany: candidates.currentCompany,
    })
    .from(candidates)
    .where(isNull(candidates.archivedAt))
    .orderBy(candidates.fullName);
}

export async function matchCandidate(input: {
  id?: string;
  linkedinUrl?: string;
  fullName?: string;
}) {
  const db = getDb();
  if (input.id) {
    const [row] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, input.id))
      .limit(1);
    if (row) return { candidate: row, match: "id" as const };
  }

  if (input.linkedinUrl) {
    try {
      const byUrl = await findByLinkedinUrl(input.linkedinUrl);
      if (byUrl) return { candidate: byUrl, match: "linkedin" as const };
    } catch {
      // URL invalide : on tente le nom.
    }
  }

  if (input.fullName?.trim()) {
    const target = foldName(input.fullName);
    const rows = await db
      .select()
      .from(candidates)
      .where(isNull(candidates.archivedAt));
    const hits = rows.filter((row) => foldName(row.fullName) === target);
    if (hits.length === 1) {
      return { candidate: hits[0], match: "name" as const };
    }
    if (hits.length > 1) {
      return { candidate: null, match: "ambiguous" as const, hits };
    }
  }

  return { candidate: null, match: "none" as const };
}

export async function updateCandidateProfile(input: {
  candidateId: string;
  fullName?: string;
  linkedinUrl?: string;
  currentTitle?: string;
  currentCompany?: string;
  locationRaw?: string;
  headline?: string;
  notes?: string;
  notesMode?: "replace" | "append";
  salaryRisk?: string;
  remoteFlag?: string;
  redFlags?: string[];
  actorName: string;
  actorEmail: string;
  actorType?: "human" | "agent" | "system";
  summary?: string;
}) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, input.candidateId))
    .limit(1);
  if (!current) {
    throw new Error("Candidat introuvable.");
  }

  const nextLinkedin = input.linkedinUrl
    ? normalizeLinkedinUrl(input.linkedinUrl)
    : current.linkedinUrl;
  if (nextLinkedin !== current.linkedinUrl) {
    const [taken] = await db
      .select({ id: candidates.id })
      .from(candidates)
      .where(eq(candidates.linkedinUrl, nextLinkedin))
      .limit(1);
    if (taken && taken.id !== current.id) {
      throw new Error("Cette URL LinkedIn est déjà utilisée.");
    }
  }

  const notes =
    input.notes === undefined
      ? current.notes
      : input.notesMode === "replace"
        ? emptyToNull(input.notes)
        : current.notes
          ? `${current.notes}\n\n${input.notes}`
          : emptyToNull(input.notes);

  const changed: string[] = [];
  if (input.fullName && input.fullName.trim() !== current.fullName) {
    changed.push("nom");
  }
  if (nextLinkedin !== current.linkedinUrl) changed.push("linkedin");
  if (input.currentTitle !== undefined) changed.push("titre");
  if (input.currentCompany !== undefined) changed.push("entreprise");
  if (input.locationRaw !== undefined) changed.push("lieu");
  if (input.headline !== undefined) changed.push("headline");
  if (input.notes !== undefined) changed.push("notes");
  if (input.salaryRisk !== undefined) changed.push("salaire");
  if (input.remoteFlag !== undefined) changed.push("remote");
  if (input.redFlags !== undefined) changed.push("flags");

  const [updated] = await db
    .update(candidates)
    .set({
      fullName: input.fullName?.trim() || current.fullName,
      linkedinUrl: nextLinkedin,
      linkedinSlug: linkedinSlugFromUrl(nextLinkedin),
      currentTitle:
        input.currentTitle !== undefined
          ? emptyToNull(input.currentTitle)
          : current.currentTitle,
      currentCompany:
        input.currentCompany !== undefined
          ? emptyToNull(input.currentCompany)
          : current.currentCompany,
      locationRaw:
        input.locationRaw !== undefined
          ? emptyToNull(input.locationRaw)
          : current.locationRaw,
      headline:
        input.headline !== undefined
          ? emptyToNull(input.headline)
          : current.headline,
      notes,
      salaryRisk:
        input.salaryRisk !== undefined
          ? emptyToNull(input.salaryRisk)
          : current.salaryRisk,
      remoteFlag:
        input.remoteFlag !== undefined
          ? emptyToNull(input.remoteFlag)
          : current.remoteFlag,
      redFlags: input.redFlags ?? current.redFlags,
      updatedAt: new Date(),
      lastSeenAt: new Date(),
    })
    .where(eq(candidates.id, input.candidateId))
    .returning();

  if (changed.length > 0) {
    await db.insert(candidateEvents).values({
      candidateId: input.candidateId,
      type: input.salaryRisk !== undefined ? "salary_update" : "note",
      actorType: input.actorType ?? "human",
      actorName: input.actorName,
      actorEmail: input.actorEmail,
      summary:
        input.summary?.trim() ||
        `Profil mis à jour (${changed.join(", ")})`,
      payload: { changed },
    });
  }

  return updated;
}

export async function archiveCandidate(input: {
  candidateId: string;
  actorName: string;
  actorEmail: string;
  actorType?: "human" | "agent" | "system";
}) {
  const db = getDb();
  const [current] = await db
    .select()
    .from(candidates)
    .where(eq(candidates.id, input.candidateId))
    .limit(1);
  if (!current) {
    throw new Error("Candidat introuvable.");
  }

  await db
    .update(candidates)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(eq(candidates.id, input.candidateId));

  await db.insert(candidateEvents).values({
    candidateId: input.candidateId,
    type: "note",
    actorType: input.actorType ?? "human",
    actorName: input.actorName,
    actorEmail: input.actorEmail,
    summary: "Profil retiré du pipeline",
    payload: { archived: true },
  });
}

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
