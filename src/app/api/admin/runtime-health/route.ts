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
  let tables: { ok: boolean; missing: string[] } = { ok: false, missing: [] };

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

    if (database.ok) {
      try {
        const requiredTables = [
          "app_settings",
          "auth_accounts",
          "live_tenders",
          "live_applications",
          "live_partner_contracts",
          "workflow_mandate_quotes",
          "workflow_mandate_bookings",
          "workflow_control_actions",
          "workflow_control_action_comments",
          "workflow_notifications",
          "workflow_monthly_reports",
          "workflow_audit_events",
          "workflow_email_deliveries",
          "fr24_runtime_settings",
        ];
        const result = await withPostgres(async (client) => {
          const tableResult = await client.query<{ table_name: string }>(
            `
              select table_name
              from information_schema.tables
              where table_schema = 'public'
                and table_name = any($1::text[])
            `,
            [requiredTables],
          );
          const existing = new Set(tableResult.rows.map((row) => row.table_name));
          return requiredTables.filter((table) => !existing.has(table));
        });
        const missing = result ?? requiredTables;
        tables = { ok: missing.length === 0, missing };
      } catch (error) {
        tables = { ok: false, missing: [`table check failed: ${error instanceof Error ? error.message : String(error)}`] };
      }
    }
  }

  return NextResponse.json({
    ok: postgres.hasDatabaseUrl && database.ok && tables.ok,
    checkedAt: new Date().toISOString(),
    postgres,
    database,
    tables,
  });
}
