import "./load-env.mjs";
import pg from "pg";

const failures = [];
const warnings = [];

const databaseUrl = process.env.DATABASE_URL;
const checks = [];

if (!databaseUrl) failures.push("DATABASE_URL is required");

if (databaseUrl) {
  await checkDatabaseConnection();
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
    process.env.ATTACHMENT_STORAGE_ROOT ||
    process.env.FILE_STORAGE_ROOT ||
    process.env.RAILWAY_VOLUME_MOUNT_PATH
  );
}
