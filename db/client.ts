import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let database: ReturnType<typeof createDatabase> | undefined;

function createDatabase(url: string) {
  return drizzle(neon(url), { schema });
}

export function getDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required to connect to Neon.");
  }
  database ??= createDatabase(url);
  return database;
}
