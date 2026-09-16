import { ingestOptions, ingestSpec } from "@/lib/agent/http";

export function OPTIONS() {
  return ingestOptions();
}

export function GET() {
  return ingestSpec();
}
