import { timingSafeEqual } from "node:crypto";
import { auth, currentUser } from "@clerk/nextjs/server";
import { isDataMajorEmail, primaryEmailFromClerkUser } from "@/lib/domain";
import { upsertLocalUser } from "@/lib/auth";
import type { AgentActor } from "@/lib/agent/types";

function tokensEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export async function resolveAgentActor(
  request: Request,
): Promise<AgentActor | { error: string; status: number }> {
  const header = request.headers.get("authorization") ?? "";
  const bearer = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const configured = process.env.CANTERA_AGENT_TOKEN;

  if (configured && bearer && tokensEqual(bearer, configured)) {
    return { name: "agent cantera", email: "agent@data-major.com", type: "agent" };
  }

  const { userId } = await auth();
  if (!userId) {
    return {
      error: "Authentification requise (session Clerk ou Bearer CANTERA_AGENT_TOKEN).",
      status: 401,
    };
  }

  const clerkUser = await currentUser();
  const email = clerkUser ? primaryEmailFromClerkUser(clerkUser) : null;
  if (!clerkUser || !isDataMajorEmail(email)) {
    return { error: "Réservé à @data-major.com.", status: 403 };
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email!;

  await upsertLocalUser({
    clerkUserId: clerkUser.id,
    email: email!,
    name,
  });

  return { name, email: email!, type: "human" };
}
