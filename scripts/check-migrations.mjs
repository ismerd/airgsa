import "./load-env.mjs";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const root = process.cwd();
const schemaPath = path.join(root, "supabase", "schema.sql");
const migrationsDir = path.join(root, "supabase", "migrations");

const requiredTables = [
  "app_settings",
  "auth_accounts",
  "auth_password_reset_tokens",
  "live_tenders",
  "live_applications",
  "live_partner_contracts",
  "platform_campaigns",
  "capacity_alerts",
  "workflow_mandate_quotes",
  "workflow_mandate_bookings",
  "workflow_control_actions",
  "workflow_control_action_comments",
  "workflow_monthly_reports",
  "workflow_audit_events",
  "workflow_notifications",
  "workflow_news_posts",
  "workflow_linkedin_sources",
  "team_accounts",
  "fr24_runtime_settings",
  "workflow_airline_profiles",
  "workflow_attachments",
  "workflow_email_deliveries",
  "workflow_user_state",
  "account_registrations",
  "airline_fleet_aircraft",
];

const schemaSql = await readFile(schemaPath, "utf8");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();
const migrationsSql = (
  await Promise.all(migrationFiles.map((file) => readFile(path.join(migrationsDir, file), "utf8")))
).join("\n\n");

const failures = [];

const schemaTables = extractSet(schemaSql, /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi);
const migrationTables = extractSet(migrationsSql, /create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z0-9_]+)/gi);
const schemaRls = extractSet(schemaSql, /alter\s+table\s+public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi);
const migrationRls = extractSet(migrationsSql, /alter\s+table\s+public\.([a-z0-9_]+)\s+enable\s+row\s+level\s+security/gi);
const schemaPolicies = extractSet(schemaSql, /create\s+policy\s+"[^"]+"\s+on\s+public\.([a-z0-9_]+)/gi);
const migrationPolicies = extractSet(migrationsSql, /create\s+policy\s+"[^"]+"\s+on\s+public\.([a-z0-9_]+)/gi);

for (const table of requiredTables) {
  if (!schemaTables.has(table)) failures.push(`${table}: missing from supabase/schema.sql`);
  if (!migrationTables.has(table)) failures.push(`${table}: missing create table migration`);
  if (!schemaRls.has(table)) failures.push(`${table}: missing RLS enable in supabase/schema.sql`);
  if (!migrationRls.has(table)) failures.push(`${table}: missing RLS enable in migrations`);
  if (!schemaPolicies.has(table)) failures.push(`${table}: missing policy in supabase/schema.sql`);
  if (!migrationPolicies.has(table)) failures.push(`${table}: missing policy in migrations`);
}

if (process.env.DATABASE_URL) {
  await checkLiveDatabase();
} else {
  console.log("DATABASE_URL is not set; skipped live database migration check.");
}

if (failures.length > 0) {
  console.error("Migration/RLS check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  migrationFiles: migrationFiles.length,
  checkedTables: requiredTables.length,
  checks: [
    "required tables exist in schema.sql",
    "required tables have create-table migrations",
    "required tables have RLS enabled in schema.sql and migrations",
    "required tables have policies in schema.sql and migrations",
    process.env.DATABASE_URL ? "live database tables/RLS/policies verified" : "live database check skipped",
  ],
}, null, 2));

function extractSet(sql, regex) {
  return new Set([...sql.matchAll(regex)].map((match) => match[1]));
}

async function checkLiveDatabase() {
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: shouldUseDatabaseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  try {
    const tablesResult = await client.query(
      `
        select table_name
        from information_schema.tables
        where table_schema = 'public'
          and table_name = any($1::text[])
      `,
      [requiredTables],
    );
    const liveTables = new Set(tablesResult.rows.map((row) => row.table_name));

    const rlsResult = await client.query(
      `
        select relname as table_name, relrowsecurity as rls_enabled
        from pg_class
        join pg_namespace on pg_namespace.oid = pg_class.relnamespace
        where pg_namespace.nspname = 'public'
          and relname = any($1::text[])
      `,
      [requiredTables],
    );
    const liveRls = new Map(rlsResult.rows.map((row) => [row.table_name, row.rls_enabled]));

    const policiesResult = await client.query(
      `
        select tablename as table_name, count(*)::int as policy_count
        from pg_policies
        where schemaname = 'public'
          and tablename = any($1::text[])
        group by tablename
      `,
      [requiredTables],
    );
    const livePolicies = new Map(policiesResult.rows.map((row) => [row.table_name, row.policy_count]));

    for (const table of requiredTables) {
      if (!liveTables.has(table)) failures.push(`${table}: missing from live database`);
      if (liveRls.get(table) !== true) failures.push(`${table}: RLS is not enabled in live database`);
      if (!livePolicies.get(table)) failures.push(`${table}: no live database policies found`);
    }
  } finally {
    await client.end();
  }
}

function shouldUseDatabaseSsl(url) {
  return process.env.DATABASE_SSL === "true" || url.includes("sslmode=require");
}
