import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { resolveAgentActor } from "@/lib/agent/auth";
import { ingestAgentPayload } from "@/lib/agent/ingest";
import { openApiSpec } from "@/lib/agent/openapi";
import { normalizeIngestBody } from "@/lib/agent/schema";
import { listCandidateCatalog } from "@/lib/candidates";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export function ingestOptions() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export function ingestSpec() {
  return NextResponse.json(openApiSpec, { headers: corsHeaders });
}

export async function ingestPost(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json(
      { ok: false, error: "Content-Type: application/json requis." },
      { status: 415, headers: corsHeaders },
    );
  }

  const actor = await resolveAgentActor(request);
  if ("error" in actor) {
    return NextResponse.json(
      { ok: false, error: actor.error },
      { status: actor.status, headers: corsHeaders },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "JSON invalide." },
      { status: 400, headers: corsHeaders },
    );
  }

  const body = normalizeIngestBody(raw);
  if (body.error) {
    return NextResponse.json(
      { ok: false, error: body.error.message, issues: body.error.issues },
      { status: 400, headers: corsHeaders },
    );
  }

  const result = await ingestAgentPayload({
    text: body.text,
    updates: body.updates,
    createIfMissing: body.createIfMissing,
    actor,
  });

  if (result.results.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Aucun profil exploitable.",
        results: result.results,
      },
      { status: 422, headers: corsHeaders },
    );
  }

  revalidatePath("/");
  const created = result.results.some((item) => item.action === "created");
  return NextResponse.json(
    { ok: true, results: result.results },
    { status: created ? 201 : 200, headers: corsHeaders },
  );
}

export async function ingestListCandidates(request: Request) {
  const actor = await resolveAgentActor(request);
  if ("error" in actor) {
    return NextResponse.json(
      { ok: false, error: actor.error },
      { status: actor.status, headers: corsHeaders },
    );
  }

  const candidates = await listCandidateCatalog();
  return NextResponse.json({ ok: true, candidates }, { headers: corsHeaders });
}
