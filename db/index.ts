import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

// A single shared connection is fine for serverless w/ connection pooling
// providers like Neon/Supabase (they pool for you). `max: 1` keeps each
// serverless function instance from opening too many connections.
// `prepare: false` because Supabase's transaction-mode pooler (Supavisor,
// port 6543 — required on Vercel since the direct connection host is
// IPv6-only and unreachable from Vercel's runtime) doesn't support
// prepared statements; harmless to disable on a direct connection too.
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

export const db = drizzle(client, { schema });
