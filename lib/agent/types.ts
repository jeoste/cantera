import {
  candidateStatuses,
  type CandidateStatus,
} from "@/drizzle/schema";

export const AGENT_STATUSES = candidateStatuses;

export type AgentUpdateInput = {
  id?: string;
  linkedinUrl?: string;
  fullName?: string;
  status?: CandidateStatus;
  currentTitle?: string;
  currentCompany?: string;
  locationRaw?: string;
  headline?: string;
  notes?: string;
  salaryRisk?: string;
  remoteFlag?: string;
  redFlags?: string[];
  createIfMissing?: boolean;
};

export type AgentApplyResult = {
  action: "updated" | "created" | "unchanged" | "skipped";
  reason?: string;
  candidateId?: string;
  fullName?: string;
  linkedinUrl?: string;
  changes: string[];
};

export type AgentActor = {
  name: string;
  email: string;
  type: "human" | "agent";
};
