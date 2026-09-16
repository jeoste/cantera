import { z } from "zod";
import {
  candidateStatuses,
  type CandidateStatus,
} from "@/drizzle/schema";
import { profileIngestSchema } from "@/lib/agent/schema";
import type { AgentUpdateInput } from "@/lib/agent/types";
import { STATUS_LABELS } from "@/lib/status";

const LINKEDIN_RE =
  /https?:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9_-]+/gi;

const STATUS_ALIASES: Record<string, CandidateStatus> = {
  ...Object.fromEntries(
    candidateStatuses.map((status) => [status, status]),
  ),
  ...Object.fromEntries(
    Object.entries(STATUS_LABELS).map(([status, label]) => [
      fold(label),
      status as CandidateStatus,
    ]),
  ),
  "a contacter": "to_contact",
  contacte: "contacted",
  "a repondu": "replied",
  repondu: "replied",
  entretien: "interview",
  offre: "offer",
  embauche: "hired",
  "pas interesse": "candidate_declined",
  "trop cher": "too_expensive",
  "hors brief": "wrong_fit",
  "en pause": "on_hold",
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function asUpdate(value: unknown): AgentUpdateInput | null {
  const parsed = profileIngestSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseStructuredUpdates(raw: unknown): AgentUpdateInput[] {
  if (Array.isArray(raw)) {
    return raw.map(asUpdate).filter((item): item is AgentUpdateInput => !!item);
  }
  if (raw && typeof raw === "object") {
    const record = raw as { profiles?: unknown; updates?: unknown };
    const list = [
      ...(Array.isArray(record.profiles) ? record.profiles : []),
      ...(Array.isArray(record.updates) ? record.updates : []),
    ];
    if (list.length > 0) {
      return list.map(asUpdate).filter((item): item is AgentUpdateInput => !!item);
    }
    const single = asUpdate(raw);
    return single ? [single] : [];
  }
  return [];
}

export function parseTextUpdates(text: string): AgentUpdateInput[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    return parseStructuredUpdates(JSON.parse(trimmed));
  } catch {
    // texte libre
  }

  const blocks = trimmed.split(/\n{2,}/);
  const updates: AgentUpdateInput[] = [];

  for (const block of blocks) {
    const update: AgentUpdateInput = {};
    const urls = block.match(LINKEDIN_RE);
    if (urls?.[0]) update.linkedinUrl = urls[0];

    for (const line of block.split("\n")) {
      const [rawKey, ...rest] = line.split(":");
      if (!rest.length) continue;
      const key = fold(rawKey);
      const value = rest.join(":").trim();
      if (!value) continue;
      if (key === "id") update.id = value;
      if (["nom", "name", "full name", "candidat"].includes(key)) {
        update.fullName = value;
      }
      if (["linkedin", "url", "profil"].includes(key)) {
        update.linkedinUrl = value;
      }
      if (["statut", "status", "colonne"].includes(key)) {
        update.status = STATUS_ALIASES[fold(value)];
      }
      if (["titre", "title", "poste"].includes(key)) update.currentTitle = value;
      if (["entreprise", "company", "societe"].includes(key)) {
        update.currentCompany = value;
      }
      if (["lieu", "location", "ville"].includes(key)) update.locationRaw = value;
      if (["headline", "accroche"].includes(key)) update.headline = value;
      if (["note", "notes", "retour", "update", "maj"].includes(key)) {
        update.notes = value;
      }
      if (["salaire", "salary"].includes(key)) update.salaryRisk = value;
    }

    if (!update.fullName) {
      const firstLine = block.split("\n")[0]?.trim();
      if (
        firstLine &&
        !firstLine.includes(":") &&
        !/linkedin\.com\/in\//i.test(firstLine) &&
        firstLine.split(/\s+/).length <= 5
      ) {
        update.fullName = firstLine;
      }
    }

    if (update.id || update.linkedinUrl || update.fullName) {
      updates.push(update);
    }
  }

  return updates;
}

export function inferStatusFromText(text: string): CandidateStatus | undefined {
  const folded = fold(text);
  if (/\btrop cher\b/.test(folded) || /\becart salarial\b/.test(folded)) {
    return "too_expensive";
  }
  if (/pas interesse/.test(folded)) return "candidate_declined";
  if (/hors brief/.test(folded) || /mauvais fit/.test(folded)) return "wrong_fit";
  if (/\bentretien\b/.test(folded)) return "interview";
  if (/\boffre\b/.test(folded) && !/refuse/.test(folded)) return "offer";
  if (/a repondu/.test(folded) || /\brepondu\b/.test(folded)) return "replied";
  if (/contacte/.test(folded) || /message envoye/.test(folded)) return "contacted";
  if (/a contacter/.test(folded)) return "to_contact";
  if (/blacklist/.test(folded)) return "blacklisted";
  if (/embauche/.test(folded)) return "hired";
  if (/sans reponse/.test(folded)) return "no_reply";
  return undefined;
}

export function parseCatalogMentions(
  text: string,
  catalog: { id: string; fullName: string; linkedinUrl: string }[],
): AgentUpdateInput[] {
  const folded = fold(text);
  const updates: AgentUpdateInput[] = [];
  const seen = new Set<string>();
  const sorted = [...catalog].sort(
    (a, b) => b.fullName.length - a.fullName.length,
  );

  for (const row of sorted) {
    const name = fold(row.fullName);
    if (name.length < 4 || !folded.includes(name) || seen.has(row.id)) continue;
    seen.add(row.id);
    updates.push({
      id: row.id,
      fullName: row.fullName,
      linkedinUrl: row.linkedinUrl,
      status: inferStatusFromText(text),
      notes: text.trim(),
    });
  }

  return updates;
}

export async function extractUpdatesWithAi(input: {
  text: string;
  catalog: string;
}): Promise<AgentUpdateInput[] | null> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return null;
  }

  const { generateText, Output } = await import("ai");
  const schema = z.object({
    updates: z.array(profileIngestSchema),
  });

  try {
    const result = await generateText({
      model: "google/gemini-2.5-flash",
      output: Output.object({ schema }),
      prompt: `Tu mets à jour un vivier de recrutement (cantera, Data-Major Ibérica).
Extrais uniquement des mises à jour de profils à partir du texte.
Statuts possibles: ${candidateStatuses.join(", ")}.
Catalogue actuel:
${input.catalog}

Règles:
- Relie chaque personne à un id du catalogue si le nom ou LinkedIn correspond.
- Ne invente pas de candidat sans nom.
- createIfMissing=true seulement s'il y a un nom ET une URL LinkedIn /in/...
- notes = le fait nouveau (retour, salaire, entretien, refus…).
- Ignore ce qui ne concerne pas un candidat.

Texte:
${input.text}`,
    });
    return result.output?.updates ?? [];
  } catch {
    return null;
  }
}
