import "./load-env.mjs";
import { readFile } from "node:fs/promises";
import { readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required to apply migrations.");
  process.exit(1);
}

const migrationsDir = path.join(process.cwd(), "supabase", "migrations");
const migrationFiles = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: shouldUseDatabaseSsl(process.env.DATABASE_URL) ? { rejectUnauthorized: false } : false,
});

await client.connect();

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      version text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const appliedResult = await client.query("select version from public.schema_migrations");
  const applied = new Set(appliedResult.rows.map((row) => row.version));
  const pending = migrationFiles.filter((file) => !applied.has(file));

  for (const file of pending) {
    const sql = makeTargetCompatibleSql(await readFile(path.join(migrationsDir, file), "utf8"));
    console.log(`Applying ${file}`);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into public.schema_migrations (version) values ($1)", [file]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  console.log(JSON.stringify({
    ok: true,
    applied: pending.length,
    skipped: migrationFiles.length - pending.length,
    migrations: pending,
  }, null, 2));
} finally {
  await client.end();
}

function shouldUseDatabaseSsl(url) {
  return process.env.DATABASE_SSL === "true" || url.includes("sslmode=require");
}

function makeTargetCompatibleSql(sql) {
  if ((process.env.MIGRATION_TARGET || "railway").toLowerCase() === "supabase") return sql;
  return sql.replace(/\s+to\s+authenticated\b/gi, "");
}
