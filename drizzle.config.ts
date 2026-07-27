import { defineConfig } from "drizzle-kit";
import { loadEnvFile } from "node:process";

for (const path of [".env.local", ".env"]) {
  try {
    loadEnvFile(path);
  } catch {
    // Environment variables may already be provided by CI or the host.
  }
}

const url =
  process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "DATABASE_URL_UNPOOLED or DATABASE_URL is required for Drizzle.",
  );
}

export default defineConfig({
  out: "./drizzle",
  schema: "./db/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
});
