import {
  ingestOptions,
  ingestPost,
  ingestSpec,
} from "@/lib/agent/http";

export function OPTIONS() {
  return ingestOptions();
}

export function GET() {
  return ingestSpec();
}

export async function POST(request: Request) {
  return ingestPost(request);
}
