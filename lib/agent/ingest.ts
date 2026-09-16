import { applyAgentUpdates } from "@/lib/agent/apply";
import {
  extractUpdatesWithAi,
  parseCatalogMentions,
  parseTextUpdates,
} from "@/lib/agent/parse";
import type { AgentActor, AgentUpdateInput } from "@/lib/agent/types";
import { listCandidateCatalog } from "@/lib/candidates";

export async function ingestAgentPayload(input: {
  text?: string;
  updates?: AgentUpdateInput[];
  actor: AgentActor;
  createIfMissing?: boolean;
}) {
  let updates: AgentUpdateInput[] = [...(input.updates ?? [])];
  const createIfMissing = input.createIfMissing ?? true;

  const text = input.text?.trim();
  if (text) {
    const catalogRows = await listCandidateCatalog();
    const catalog = catalogRows
      .map(
        (row) =>
          `${row.id} | ${row.fullName} | ${row.linkedinUrl} | ${row.status} | ${row.currentTitle ?? ""} @ ${row.currentCompany ?? ""}`,
      )
      .join("\n");
    const fromAi = await extractUpdatesWithAi({ text, catalog });
    const looksJson = text.startsWith("{") || text.startsWith("[");
    const parsed =
      fromAi && fromAi.length > 0
        ? fromAi
        : looksJson
          ? parseTextUpdates(text)
          : [...parseTextUpdates(text), ...parseCatalogMentions(text, catalogRows)];
    const deduped = new Map<string, AgentUpdateInput>();
    for (const update of [...updates, ...parsed]) {
      const key =
        update.id ?? update.linkedinUrl ?? update.fullName ?? JSON.stringify(update);
      deduped.set(key, { ...deduped.get(key), ...update });
    }
    updates = [...deduped.values()];
  }

  updates = updates.map((update) => ({
    ...update,
    createIfMissing: update.createIfMissing ?? createIfMissing,
  }));

  const results = await applyAgentUpdates(updates, input.actor);
  return { updates, results };
}
