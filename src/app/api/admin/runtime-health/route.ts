import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getPostgresRuntimeDiagnostics, withPostgres } from "@/lib/services/postgres-store";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const postgres = getPostgresRuntimeDiagnostics();
  let database: { ok: true } | { ok: false; error: string } = { ok: false, error: "No Postgres connection variables detected." };

  if (postgres.hasDatabaseUrl) {
    try {
      const result = await withPostgres(async (client) => {
        await client.query("select 1");
        return true;
      });
      database = result ? { ok: true } : { ok: false, error: "Postgres connection was not opened." };
    } catch (error) {
      database = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  return NextResponse.json({
    ok: postgres.hasDatabaseUrl && database.ok,
    checkedAt: new Date().toISOString(),
    postgres,
    database,
  });
}
