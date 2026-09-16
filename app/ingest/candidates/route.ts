import { ingestListCandidates, ingestOptions } from "@/lib/agent/http";

export function OPTIONS() {
  return ingestOptions();
}

export async function GET(request: Request) {
  return ingestListCandidates(request);
}
