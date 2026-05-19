import "./load-env.mjs";

const required = [
  ["AUTH_SESSION_SECRET", "Session cookie signing secret"],
  ["DATABASE_URL", "Persistent Railway Postgres database"],
  ["NEXT_PUBLIC_APP_URL", "Canonical app URL for emails and auth links"],
];

const warnings = [
  [
    "Supabase optional auth/storage",
    () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    "Supabase is not configured; Railway Postgres auth will be used",
  ],
  [
    "Workflow attachment storage",
    () => Boolean(
      (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
      process.env.ATTACHMENT_STORAGE_ROOT ||
      process.env.FILE_STORAGE_ROOT ||
      process.env.RAILWAY_VOLUME_MOUNT_PATH
    ),
    "No production attachment storage provider configured; set ATTACHMENT_STORAGE_ROOT or mount a Railway volume",
  ],
  [
    "WORKFLOW_EMAIL_ENABLED",
    (value) => value === "true",
    "Workflow emails are disabled unless WORKFLOW_EMAIL_ENABLED=true",
  ],
  [
    "RESEND_API_KEY, SMTP_HOST, or WORKFLOW_EMAIL_WEBHOOK_URL",
    () => Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.WORKFLOW_EMAIL_WEBHOOK_URL),
    "No workflow email provider configured",
  ],
  [
    "FLIGHTRADAR24_API_KEY",
    (value) => Boolean(value),
    "FR24 live flight tracking will use schedule fallback",
  ],
  [
    "LINKEDIN_API_TOKEN",
    (value) => Boolean(value),
    "LinkedIn intelligence import cannot run",
  ],
  [
    "ECARGOWARE credentials",
    () => Boolean(process.env.ECARGOWARE_BEARER_TOKEN || (process.env.ECARGOWARE_USERNAME && process.env.ECARGOWARE_PASSWORD)),
    "eCargoWare execution API will return not-configured",
  ],
];

const failures = [];
for (const [name, reason] of required) {
  if (!process.env[name]) failures.push(`${name}: ${reason}`);
}

if (process.env.AUTH_SESSION_SECRET === "airgsa-development-session-secret-change-me") {
  failures.push("AUTH_SESSION_SECRET: development fallback must not be used in production");
}

if (process.env.AUTH_SESSION_SECRET && process.env.AUTH_SESSION_SECRET.length < 32) {
  failures.push("AUTH_SESSION_SECRET: must be at least 32 characters");
}

if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")) {
  failures.push("NEXT_PUBLIC_APP_URL: production URL must use https://");
}

if (process.env.ALLOW_DEMO_ACCOUNTS === "true") {
  failures.push("ALLOW_DEMO_ACCOUNTS: must not be true in production");
}

if (process.env.NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS === "true") {
  failures.push("NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS: must not be true in production");
}

if (process.env.ALLOW_FILE_STORE_FALLBACK === "true") {
  failures.push("ALLOW_FILE_STORE_FALLBACK: must not be true in production");
}

const warningMessages = warnings
  .filter(([name, predicate]) => !predicate(process.env[name]))
  .map(([name, , message]) => `${name}: ${message}`);

if (process.env.RESEND_API_KEY && !process.env.WORKFLOW_EMAIL_FROM) {
  warningMessages.push("WORKFLOW_EMAIL_FROM: Resend will use onboarding@resend.dev test sender, which only sends to your own Resend account email");
}

if (failures.length > 0) {
  console.error("Production environment check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  if (warningMessages.length > 0) {
    console.error("\nWarnings:");
    for (const warning of warningMessages) console.error(`- ${warning}`);
  }
  process.exit(1);
}

console.log("Production environment check passed.");
if (warningMessages.length > 0) {
  console.log("Warnings:");
  for (const warning of warningMessages) console.log(`- ${warning}`);
}
