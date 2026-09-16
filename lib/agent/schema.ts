import { z } from "zod";
import { candidateStatuses } from "@/drizzle/schema";
import type { AgentUpdateInput } from "@/lib/agent/types";
import { normalizeLinkedinUrl } from "@/lib/linkedin";

const linkedinUrlSchema = z
  .string()
  .trim()
  .min(1)
  .transform((value, ctx) => {
    try {
      return normalizeLinkedinUrl(value);
    } catch (error) {
      ctx.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "URL LinkedIn /in/… invalide.",
      });
      return z.NEVER;
    }
  });

export const profileIngestSchema = z
  .object({
    id: z.string().uuid().optional(),
    linkedinUrl: linkedinUrlSchema.optional(),
    fullName: z.string().trim().min(1).optional(),
    status: z.enum(candidateStatuses).optional(),
    currentTitle: z.string().trim().min(1).optional(),
    currentCompany: z.string().trim().min(1).optional(),
    locationRaw: z.string().trim().min(1).optional(),
    headline: z.string().trim().min(1).optional(),
    notes: z.string().trim().min(1).optional(),
    salaryRisk: z.string().trim().min(1).optional(),
    remoteFlag: z.string().trim().min(1).optional(),
    redFlags: z.array(z.string().trim().min(1)).optional(),
    createIfMissing: z.boolean().optional(),
  })
  .strict()
  .refine((row) => Boolean(row.id || row.linkedinUrl || row.fullName), {
    message: "Chaque profil doit avoir id, linkedinUrl ou fullName.",
  });

const envelopeSchema = z
  .object({
    createIfMissing: z.boolean().optional().default(true),
    profiles: z.array(profileIngestSchema).optional(),
    updates: z.array(profileIngestSchema).optional(),
    text: z.string().optional(),
  })
  .strict()
  .refine(
    (body) =>
      (body.profiles?.length ?? 0) > 0 ||
      (body.updates?.length ?? 0) > 0 ||
      Boolean(body.text?.trim()),
    { message: "Envoie `profiles` : tableau d’objets { fullName, linkedinUrl, ... }." },
  );

function isBareProfile(value: unknown): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    !("profiles" in record) &&
    !("updates" in record) &&
    !("text" in record) &&
    ("id" in record || "linkedinUrl" in record || "fullName" in record)
  );
}

function issuesOf(error: z.ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

export function normalizeIngestBody(raw: unknown): {
  updates: AgentUpdateInput[];
  createIfMissing: boolean;
  text?: string;
  error?: { message: string; issues: { path: string; message: string }[] };
} {
  const invalid = (error: z.ZodError) => ({
    updates: [] as AgentUpdateInput[],
    createIfMissing: true,
    error: {
      message:
        'JSON invalide. Attendu : { "profiles": [ { "fullName": "...", "linkedinUrl": "https://www.linkedin.com/in/..." } ] }',
      issues: issuesOf(error),
    },
  });

  if (Array.isArray(raw)) {
    const parsed = z.array(profileIngestSchema).min(1).safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    return { updates: parsed.data, createIfMissing: true };
  }

  if (isBareProfile(raw)) {
    const parsed = profileIngestSchema.safeParse(raw);
    if (!parsed.success) return invalid(parsed.error);
    return { updates: [parsed.data], createIfMissing: true };
  }

  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);

  return {
    updates: [...(parsed.data.profiles ?? []), ...(parsed.data.updates ?? [])],
    createIfMissing: parsed.data.createIfMissing ?? true,
    text: parsed.data.text,
  };
}
