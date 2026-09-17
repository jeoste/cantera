import { auth, currentUser } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { users, type User } from "@/drizzle/schema";
import { isDataMajorEmail, primaryEmailFromClerkUser } from "@/lib/domain";

export type SessionUser = {
  clerkUserId: string;
  local: User;
  email: string;
  name: string;
};

export const requireRecruiter = cache(async (): Promise<SessionUser> => {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const clerkUser = await currentUser();
  if (!clerkUser) {
    redirect("/sign-in");
  }

  const email = primaryEmailFromClerkUser(clerkUser);
  if (!isDataMajorEmail(email)) {
    redirect("/forbidden");
  }

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    clerkUser.username ||
    email!;

  const local = await upsertLocalUser({
    clerkUserId: clerkUser.id,
    email: email!,
    name,
  });

  return { clerkUserId: clerkUser.id, local, email: email!, name };
});

export async function upsertLocalUser(input: {
  clerkUserId: string;
  email: string;
  name: string;
}): Promise<User> {
  const email = input.email.toLowerCase();
  const now = new Date();

  const db = getDb();
  const [existingByClerk] = await db
    .select()
    .from(users)
    .where(eq(users.clerkUserId, input.clerkUserId))
    .limit(1);
  if (existingByClerk) {
    if (existingByClerk.name !== input.name || existingByClerk.email !== email) {
      const [updated] = await db
        .update(users)
        .set({ name: input.name, email, updatedAt: now })
        .where(eq(users.id, existingByClerk.id))
        .returning();
      return updated;
    }
    return existingByClerk;
  }

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existingByEmail) {
    const [updated] = await db
      .update(users)
      .set({
        clerkUserId: input.clerkUserId,
        name: input.name,
        updatedAt: now,
      })
      .where(eq(users.id, existingByEmail.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(users)
    .values({
      clerkUserId: input.clerkUserId,
      email,
      name: input.name,
      role: "recruiter",
    })
    .returning();
  return created;
}
