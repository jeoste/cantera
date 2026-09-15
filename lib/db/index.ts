import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/drizzle/schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

let cached: Database | undefined;

export function getDb(): Database {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL manquante. Crée un projet Neon et copie l’URL dans .env.local.",
    );
  }
  cached = drizzle(neon(url), { schema });
  return cached;
}
