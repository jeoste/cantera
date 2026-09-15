import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import {
  candidateEvents,
  candidates,
  users,
  type CandidateStatus,
} from "@/drizzle/schema";
import { getDb } from "@/lib/db";
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
      sourceFirst: "manual",
      doNotPropose: false,
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .returning();

  await db.insert(candidateEvents).values({
    candidateId: candidate.id,
    type: "discovered",
    actorType: "human",
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
    actorType: "human",
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
    actorType: "human",
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

function emptyToNull(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}
