# AirGSA Production Runbook

This is the deployment gate for the SaaS version of AirGSA. The production baseline is Railway app + Railway Postgres.

## Required Environment

Set these in Railway:

- `NODE_ENV=production`
- `AUTH_SESSION_SECRET` with at least 32 characters
- `NEXT_PUBLIC_APP_URL=https://...`
- `DATABASE_URL` from the Railway Postgres service
- `DATABASE_SSL=true` when Railway exposes an external SSL connection
- `ALLOW_DEMO_ACCOUNTS=false`
- `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false`
- `ALLOW_WORKFLOW_SEED=false`
- `ALLOW_FILE_STORE_FALLBACK=false`
- `RAILWAY_VOLUME_MOUNT_PATH=/data` or `ATTACHMENT_STORAGE_ROOT=/data/attachments` when file uploads should persist on a Railway volume

Optional providers for full production behavior:

- Email: `WORKFLOW_EMAIL_ENABLED=true` and either `SMTP_HOST`, `RESEND_API_KEY`, or `WORKFLOW_EMAIL_WEBHOOK_URL`
- Customer RFQ email extraction: `OPENAI_API_KEY` and optional `OPENAI_QUOTE_EXTRACTION_MODEL=gpt-4.1-mini`
- Flight tracking: `FLIGHTRADAR24_API_KEY`
- LinkedIn import: `LINKEDIN_API_TOKEN`
- Cargo execution: `ECARGOWARE_BEARER_TOKEN` or `ECARGOWARE_USERNAME` plus `ECARGOWARE_PASSWORD`
- Attachments: Railway volume via `RAILWAY_VOLUME_MOUNT_PATH`/`ATTACHMENT_STORAGE_ROOT`

Resend is the cheapest MVP email path. With only `RESEND_API_KEY`, AirGSA uses `AirGSA <onboarding@resend.dev>` for testing. Resend restricts that sender to the email address of your own Resend account. Before sending resets or workflow emails to real users, verify a domain and set `WORKFLOW_EMAIL_FROM=AirGSA <noreply@your-domain.com>`.

Approved Airline/GSA access requests require transactional email. The app sends a single-use setup link; it no longer exposes temporary passwords in the admin UI.

## Railway Variables MVP Set

For the current Railway-only MVP, set these on the Railway app service, not in Git:

```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://<your-railway-app-domain>
AUTH_SESSION_SECRET=<generate-a-long-random-secret>
DATABASE_URL=${{Postgres.DATABASE_URL}}
DATABASE_SSL=true
ALLOW_DEMO_ACCOUNTS=false
NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=false
ALLOW_WORKFLOW_SEED=false
ALLOW_FILE_STORE_FALLBACK=false
WORKFLOW_EMAIL_ENABLED=true
RESEND_API_KEY=<your-resend-key>
WORKFLOW_EMAIL_FROM=AirGSA <onboarding@resend.dev>
RAILWAY_VOLUME_MOUNT_PATH=/data
OPENAI_API_KEY=<optional-for-rfq-email-extraction>
OPENAI_QUOTE_EXTRACTION_MODEL=gpt-4.1-mini
```

Use the Resend onboarding sender only for tests. It is enough for password reset and workflow email smoke tests while you do not have a verified domain. For real customers, verify a domain in Resend and replace `WORKFLOW_EMAIL_FROM` with an address on that domain.

## Database And Storage

Railway Postgres is the primary database. Apply all files in `db/migrations` to the Railway Postgres database before deployment. The SQL is plain Postgres migration SQL.

```bash
npm run db:migrate
```

Create the first production admin once after migrations:

```bash
BOOTSTRAP_ADMIN_EMAIL=founder@example.com \
BOOTSTRAP_ADMIN_PASSWORD='use-a-long-unique-password' \
npm run admin:bootstrap
```

On Windows PowerShell:

```powershell
$env:BOOTSTRAP_ADMIN_EMAIL="founder@example.com"
$env:BOOTSTRAP_ADMIN_PASSWORD="use-a-long-unique-password"
npm run admin:bootstrap
```

The bootstrap script creates or updates one active `admin` / `owner` account in Railway Postgres. Remove the bootstrap password variable from your shell or Railway variables after use. Do not enable demo accounts in production.

The release gate is:

```bash
npm run check:migrations
npm run check:live-services
```

`check:migrations` verifies the required workflow tables, RLS enablement, and policies. When `DATABASE_URL` is set, it also verifies the live Railway database.

`check:live-services` verifies:

- `DATABASE_URL` accepts a SQL connection
- Provider gaps are reported as warnings unless they block the configured feature

## Multi-Tenant Baseline

Tenant isolation is enforced in the app by `companyId`, role, and route/API permission checks. Railway Postgres is fine for multiple customers as long as:

- every production row carries the correct airline/GSA company id where required
- admin-only routes remain protected
- demo accounts and file fallback are disabled
- migrations and smoke tests pass against the target database before release

## Release Gate

Run these before shipping:

```bash
npm ci
npm run check:production
npm run check:migrations
npm run check:live-services
npm audit --audit-level=high
npx tsc --noEmit
npm run lint
npm run build
```

Then start the app and run the API smoke tests against the running deployment or staging URL:

```bash
WORKFLOW_SMOKE_BASE_URL=https://your-staging-url npm run test:workflow
PERMISSION_TEST_BASE_URL=https://your-staging-url npm run test:permissions
```

`test:workflow` validates the core revenue flow:

- Airline creates a tender
- GSA submits an application
- Airline accepts the application
- Contract is created with tenant ids
- Tender route is copied to contract
- Airline assigns the route
- GSA sees the assigned route

`test:permissions` validates cross-tenant access protection and security headers.

## No-Go Conditions

Do not deploy if any of these are true:

- `check:production`, `check:migrations`, `check:live-services`, `build`, `lint`, `tsc`, `test:workflow`, or `test:permissions` fails.
- Demo accounts or workflow seed are enabled in production.
- File-store fallback is enabled in production without a mounted production volume.
- Production app URL is not HTTPS.
- Email delivery is enabled but no provider is configured.
- Migrations have not been applied to the live Railway Postgres database.
- Attachment uploads are enabled without a persistent Railway volume or another storage provider.

## Current Production Readiness

Code-level readiness is high. The remaining release blockers are external:

- Railway production variables must be set.
- Migrations must be applied to Railway Postgres.
- Live DB checks must pass against Railway.
- Email, FR24, LinkedIn, eCargoWare, and production attachment storage need real provider credentials for full operational coverage.
