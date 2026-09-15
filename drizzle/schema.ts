import {
  boolean,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const candidateStatuses = [
  "new",
  "proposed",
  "to_contact",
  "contacted",
  "replied",
  "interview",
  "offer",
  "hired",
  "rejected_by_us",
  "no_reply",
  "candidate_declined",
  "on_hold",
  "blacklisted",
  "too_expensive",
  "wrong_fit",
] as const;

export type CandidateStatus = (typeof candidateStatuses)[number];

export const candidateStatusEnum = pgEnum("candidate_status", [
  "new",
  "proposed",
  "to_contact",
  "contacted",
  "replied",
  "interview",
  "offer",
  "hired",
  "rejected_by_us",
  "no_reply",
  "candidate_declined",
  "on_hold",
  "blacklisted",
  "too_expensive",
  "wrong_fit",
]);

export const userRoles = ["admin", "recruiter", "viewer", "agent"] as const;
export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "recruiter",
  "viewer",
  "agent",
]);

export const eventTypes = [
  "discovered",
  "proposed_in_digest",
  "status_changed",
  "contacted",
  "reply_received",
  "interview",
  "colleague_feedback",
  "note",
  "salary_update",
  "flag_added",
  "import",
] as const;
export const eventTypeEnum = pgEnum("event_type", [
  "discovered",
  "proposed_in_digest",
  "status_changed",
  "contacted",
  "reply_received",
  "interview",
  "colleague_feedback",
  "note",
  "salary_update",
  "flag_added",
  "import",
]);

export const actorTypes = ["human", "agent", "system"] as const;
export const actorTypeEnum = pgEnum("actor_type", [
  "human",
  "agent",
  "system",
]);

export const sourceFirstValues = [
  "linkedin_search",
  "inbound_job_post",
  "referral",
  "manual",
  "other",
] as const;
export const sourceFirstEnum = pgEnum("source_first", [
  "linkedin_search",
  "inbound_job_post",
  "referral",
  "manual",
  "other",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: userRoleEnum("role").notNull().default("recruiter"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    linkedinUrl: text("linkedin_url").notNull().unique(),
    linkedinSlug: text("linkedin_slug"),
    fullName: text("full_name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
    headline: text("headline"),
    currentTitle: text("current_title"),
    currentCompany: text("current_company"),
    locationRaw: text("location_raw"),
    locationCity: text("location_city"),
    locationCountry: text("location_country"),
    skills: jsonb("skills").$type<string[]>().notNull().default([]),
    languages: jsonb("languages")
      .$type<{ code: string; level: string; signals: string[] }[]>()
      .notNull()
      .default([]),
    frenchClientReady: boolean("french_client_ready"),
    salaryRisk: text("salary_risk"),
    remoteFlag: text("remote_flag"),
    redFlags: jsonb("red_flags").$type<string[]>().notNull().default([]),
    status: candidateStatusEnum("status").notNull().default("to_contact"),
    doNotPropose: boolean("do_not_propose").notNull().default(false),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    sourceFirst: sourceFirstEnum("source_first").notNull().default("manual"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastProposedAt: timestamp("last_proposed_at", { withTimezone: true }),
    lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("candidates_status_idx").on(table.status),
    index("candidates_owner_idx").on(table.ownerUserId),
  ],
);

export const candidateEvents = pgTable(
  "candidate_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id),
    type: eventTypeEnum("type").notNull(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorType: actorTypeEnum("actor_type").notNull().default("human"),
    actorName: text("actor_name").notNull(),
    actorEmail: text("actor_email"),
    fromStatus: candidateStatusEnum("from_status"),
    toStatus: candidateStatusEnum("to_status"),
    channel: text("channel"),
    summary: text("summary").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("candidate_events_candidate_idx").on(table.candidateId)],
);

export type User = typeof users.$inferSelect;
export type Candidate = typeof candidates.$inferSelect;
export type CandidateEvent = typeof candidateEvents.$inferSelect;
