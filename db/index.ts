import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local and fill it in.");
}

// A single shared connection is fine for serverless w/ connection pooling
// providers like Neon/Supabase (they pool for you). `max: 1` keeps each
// serverless function instance from opening too many connections.
const client = postgres(process.env.DATABASE_URL, { max: 1 });

export const db = drizzle(client, { schema });
