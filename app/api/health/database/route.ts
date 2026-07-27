import { sql } from "drizzle-orm";
import { getDatabase } from "@/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDatabase().execute(sql`select 1`);
    return Response.json({ database: "ok" });
  } catch {
    return Response.json({ database: "unavailable" }, { status: 503 });
  }
}
