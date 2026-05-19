import "./load-env.mjs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const failures = [];
const warnings = [];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const databaseUrl = process.env.DATABASE_URL;
const hasSupabase = Boolean(supabaseUrl && supabaseAnonKey && serviceRoleKey);
const hasPartialSupabase = Boolean(supabaseUrl || supabaseAnonKey || serviceRoleKey);
const checks = [];

if (!databaseUrl) failures.push("DATABASE_URL is required");
if (hasPartialSupabase && !hasSupabase) {
  failures.push("Supabase configuration is incomplete; set all Supabase variables or remove them for Railway-only mode");
}

if (databaseUrl) {
  await checkDatabaseConnection();
}

if (hasSupabase) {
  await checkSupabaseAuth();
  await checkSupabaseStorage();
} else {
  warnings.push("Supabase is not configured; Railway Postgres auth is the primary auth path");
}

if (process.env.WORKFLOW_EMAIL_ENABLED === "true" && !hasEmailProvider()) {
  failures.push("WORKFLOW_EMAIL_ENABLED=true requires RESEND_API_KEY, SMTP_HOST, or WORKFLOW_EMAIL_WEBHOOK_URL");
}

if (process.env.WORKFLOW_EMAIL_ENABLED !== "true") {
  warnings.push("Workflow email delivery is disabled");
}

if (process.env.SMTP_HOST && (!process.env.SMTP_FROM && !process.env.WORKFLOW_EMAIL_FROM)) {
  warnings.push("SMTP_HOST is configured; set SMTP_FROM or WORKFLOW_EMAIL_FROM before sending production mail");
}

if (process.env.RESEND_API_KEY && !process.env.WORKFLOW_EMAIL_FROM) {
  warnings.push("RESEND_API_KEY is configured without WORKFLOW_EMAIL_FROM; onboarding@resend.dev only sends to your own Resend account email");
}

if (!hasAttachmentStorage()) {
  warnings.push("Attachment storage is not configured; set ATTACHMENT_STORAGE_ROOT or mount a Railway volume for production uploads");
}

if (!process.env.FLIGHTRADAR24_API_KEY) {
  warnings.push("FLIGHTRADAR24_API_KEY is missing; live map will use fallback data");
}

if (!process.env.LINKEDIN_API_TOKEN) {
  warnings.push("LINKEDIN_API_TOKEN is missing; LinkedIn import cannot run");
}

if (!process.env.ECARGOWARE_BEARER_TOKEN && !(process.env.ECARGOWARE_USERNAME && process.env.ECARGOWARE_PASSWORD)) {
  warnings.push("eCargoWare credentials are missing; execution API will return not-configured");
}

if (failures.length > 0) {
  console.error("Live services check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warnings.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warnings) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  checks,
  warnings,
}, null, 2));

async function checkSupabaseAuth() {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const anon = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error: sessionError } = await anon.auth.getSession();
  if (sessionError) failures.push(`Supabase anon client failed: ${sessionError.message}`);

  const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
  if (error) failures.push(`Supabase Auth Admin check failed: ${error.message}`);
  if (!sessionError && !error) {
    checks.push("Supabase Auth optional provider is reachable");
  }
}

async function checkSupabaseStorage() {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  const { data, error } = await admin.storage.getBucket("workflow-attachments");
  if (error) {
    failures.push(`Supabase Storage bucket check failed: ${error.message}`);
    return;
  }
  if (!data) {
    failures.push("Supabase Storage bucket workflow-attachments is missing");
    return;
  }
  if (data.public) failures.push("Supabase Storage bucket workflow-attachments must be private");
  if (!data.public) checks.push("Supabase workflow-attachments bucket exists and is private");
}

async function checkDatabaseConnection() {
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: shouldUseDatabaseSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
  });
  try {
    await client.connect();
    await client.query("select 1");
    checks.push("DATABASE_URL accepts a SQL connection");
  } catch (error) {
    failures.push(`DATABASE_URL connection failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await client.end().catch(() => undefined);
  }
}

function shouldUseDatabaseSsl(url) {
  return process.env.DATABASE_SSL === "true" || url.includes("sslmode=require");
}

function hasEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.WORKFLOW_EMAIL_WEBHOOK_URL);
}

function hasAttachmentStorage() {
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    process.env.ATTACHMENT_STORAGE_ROOT ||
    process.env.FILE_STORAGE_ROOT ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH
  );
}
