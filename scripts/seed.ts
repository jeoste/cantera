import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import {
  candidateEvents,
  candidates,
  users,
  type CandidateStatus,
} from "../drizzle/schema";
import { linkedinSlugFromUrl, normalizeLinkedinUrl } from "../lib/linkedin";

config({ path: ".env.local" });
config({ path: ".env" });

type SeedCandidate = {
  fullName: string;
  linkedinPath: string;
  status: CandidateStatus;
  feedback: string;
  lastContactedAt?: string;
  redFlags?: string[];
  salaryRisk?: string;
  remoteFlag?: string;
  ownerEmail?: string;
  proposed?: boolean;
};

const SEED_USERS = [
  { name: "Antoine Gouedard", email: "antoine.gouedard@data-major.com" },
  { name: "Jeoffrey Stéphan", email: "jeoffrey.stephan@data-major.com" },
  { name: "Luis Laffitte", email: "luis.laffitte@data-major.com" },
];

const SHORTLIST: SeedCandidate[] = [
  {
    fullName: "Aboubakr Aakaou",
    linkedinPath: "https://www.linkedin.com/in/aboubakraakaou/",
    status: "rejected_by_us",
    feedback: "Déjà contacté, pas donné suite",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Guillaume Avezard",
    linkedinPath: "https://www.linkedin.com/in/guillaumeavezard/",
    status: "candidate_declined",
    feedback: "Entretien fait, lui n’a pas donné suite",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Mohamed Serbout",
    linkedinPath: "https://www.linkedin.com/in/mohamed-serbout-a46a32194/",
    status: "no_reply",
    feedback: "Contacté 26/02, pas de réponse",
    lastContactedAt: "2026-02-26",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Daverson Arenas",
    linkedinPath: "https://www.linkedin.com/in/daverson-arenas/",
    status: "contacted",
    feedback: "Contacté 14/09",
    lastContactedAt: "2026-09-14",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Alae Souihli",
    linkedinPath: "https://www.linkedin.com/in/alae-souihli-324405234/",
    status: "no_reply",
    feedback: "Contacté 16/02, pas de réponse",
    lastContactedAt: "2026-02-16",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Salmen Zouari",
    linkedinPath: "https://www.linkedin.com/in/salmen-zouari/",
    status: "contacted",
    feedback: "Contacté 14/09",
    lastContactedAt: "2026-09-14",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Nicolas Connan",
    linkedinPath: "https://www.linkedin.com/in/nicolas-connan/",
    status: "too_expensive",
    feedback: "Hésite — remote Canada, trop cher",
    redFlags: ["canada_remote"],
    salaryRisk: "likely_too_expensive",
    remoteFlag: "remote",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Miguel Ángel Sarmiento Levy",
    linkedinPath: "https://www.linkedin.com/in/miguel-sarmiento-levy/en/",
    status: "contacted",
    feedback: "Contacté 14/09",
    lastContactedAt: "2026-09-14",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Youssef Berrada",
    linkedinPath: "https://www.linkedin.com/in/yob-data/",
    status: "too_expensive",
    feedback: "Pivot + salaire type Suisse remote",
    redFlags: ["swiss_pay"],
    salaryRisk: "likely_too_expensive",
    remoteFlag: "remote",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Carlos Facundo C.",
    linkedinPath: "https://www.linkedin.com/in/carlosfacundocornejo/",
    status: "blacklisted",
    feedback: "Profil à problème (posts recruteurs)",
    redFlags: ["complains_about_recruiters"],
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Silvia Carrasco",
    linkedinPath: "https://www.linkedin.com/in/silvia-carrasco-6b7169213/",
    status: "contacted",
    feedback: "Contacté 14/09",
    lastContactedAt: "2026-09-14",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
  {
    fullName: "Rayen Mbarek",
    linkedinPath: "https://www.linkedin.com/in/rayen-mbarek-8a55a9198/",
    status: "no_reply",
    feedback: "Déjà contacté, pas donné suite",
    ownerEmail: "antoine.gouedard@data-major.com",
  },
];

const ALREADY_PROPOSED: SeedCandidate[] = [
  {
    fullName: "Sara Nouini",
    linkedinPath: "https://www.linkedin.com/in/sara-nouini-695b01217",
    status: "proposed",
    feedback: "Déjà proposé en digest, à traiter",
    proposed: true,
  },
  {
    fullName: "Ulrich Chaupemnou",
    linkedinPath: "https://www.linkedin.com/in/ulrich-chaupemnou",
    status: "proposed",
    feedback: "Déjà proposé en digest, à traiter",
    proposed: true,
  },
  {
    fullName: "Mehdi Addar",
    linkedinPath: "https://www.linkedin.com/in/mehdi-addar-9689084b",
    status: "proposed",
    feedback: "Déjà proposé en digest, à traiter",
    proposed: true,
  },
  {
    fullName: "Erika De León",
    linkedinPath: "https://www.linkedin.com/in/erika-de-leon-a-confirmer",
    status: "proposed",
    feedback: "Déjà proposé en digest — URL LinkedIn à reconfirmer",
    redFlags: ["url_unconfirmed"],
    proposed: true,
  },
  {
    fullName: "Luis Armando Salomon Hernandez",
    linkedinPath: "https://www.linkedin.com/in/luis-salomon/",
    status: "proposed",
    feedback: "Highlight digest 15/09",
    proposed: true,
  },
  {
    fullName: "Jean Papon",
    linkedinPath: "https://www.linkedin.com/in/jean-papon-jp/",
    status: "proposed",
    feedback: "Déjà proposé en digest, à traiter",
    proposed: true,
  },
  {
    fullName: "Rachid Jaada",
    linkedinPath: "https://www.linkedin.com/in/rachidjaada42/",
    status: "proposed",
    feedback: "Déjà proposé en digest, à traiter",
    proposed: true,
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL manquante (.env.local)");
  }

  const db = drizzle(neon(url), {
    schema: { users, candidates, candidateEvents },
  });

  const userIds = new Map<string, string>();
  for (const person of SEED_USERS) {
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, person.email))
      .limit(1);
    if (existing) {
      userIds.set(person.email, existing.id);
      continue;
    }
    const [created] = await db
      .insert(users)
      .values({ name: person.name, email: person.email, role: "recruiter" })
      .returning();
    userIds.set(person.email, created.id);
  }

  const all = [...SHORTLIST, ...ALREADY_PROPOSED];
  for (const row of all) {
    const linkedinUrl = normalizeLinkedinUrl(row.linkedinPath);
    const [existing] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.linkedinUrl, linkedinUrl))
      .limit(1);
    if (existing) {
      console.log(`skip ${row.fullName}`);
      continue;
    }

    const lastContactedAt = row.lastContactedAt
      ? new Date(`${row.lastContactedAt}T12:00:00.000Z`)
      : null;
    const lastProposedAt = row.proposed
      ? new Date("2026-09-15T06:00:00.000Z")
      : null;

    const [candidate] = await db
      .insert(candidates)
      .values({
        linkedinUrl,
        linkedinSlug: linkedinSlugFromUrl(linkedinUrl),
        fullName: row.fullName,
        status: row.status,
        doNotPropose: true,
        sourceFirst: "linkedin_search",
        ownerUserId: row.ownerEmail ? userIds.get(row.ownerEmail) : null,
        redFlags: row.redFlags ?? [],
        salaryRisk: row.salaryRisk ?? null,
        remoteFlag: row.remoteFlag ?? null,
        lastContactedAt,
        lastProposedAt,
        notes: row.feedback,
      })
      .returning();

    await db.insert(candidateEvents).values({
      candidateId: candidate.id,
      type: "colleague_feedback",
      actorType: "human",
      actorName: "Antoine Gouedard",
      actorEmail: "antoine.gouedard@data-major.com",
      toStatus: row.status,
      at: new Date("2026-09-14T12:00:00.000Z"),
      summary: row.feedback,
      payload: {
        verbatim: row.feedback,
        source_thread: "Shortlist LinkedIn — Málaga / français / data",
        source_date: "2026-09-14",
      },
    });

    console.log(`seeded ${row.fullName}`);
  }

  console.log("Seed terminé.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
