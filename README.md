# AirGSA MVP

B2B aviation cargo MVP built with Next.js App Router, TypeScript, TailwindCSS, shadcn-style UI primitives, Railway Postgres-backed services, and Recharts.

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Production Build

```bash
npm run build
npm run start
```

The production start script binds to `0.0.0.0` and uses `process.env.PORT || 3000`, which is required for Railway.

## Railway Deploy

1. Push this repository to GitHub.
2. In Railway, create a new project from the GitHub repo.
3. Railway will use `railway.json`:
   - Build command: `npm run build`
   - Start command: `npm run start`
4. Add production environment variables:

```bash
DATABASE_URL=
AUTH_SESSION_SECRET=
NEXT_PUBLIC_APP_URL=
RAILWAY_VOLUME_MOUNT_PATH=/data
LINKEDIN_API_TOKEN=
LINKEDIN_IMPORT_API_URL=
```

Railway Postgres is the production database.

`LINKEDIN_API_TOKEN`, `DATABASE_URL`, and provider keys are server-side secrets. Do not expose them with a `NEXT_PUBLIC_` prefix.

`AUTH_SESSION_SECRET` signs the AirGSA session cookie. Set a long random value in production. The app provisions and authenticates approved users through Railway Postgres accounts.

Set `ALLOW_DEMO_ACCOUNTS=true` only when you intentionally want demo logins to remain available in a deployed environment.

Admin approval of access requests provisions Railway Postgres auth accounts and sends a single-use setup link to the approved user. The user sets their own password, is signed in, and can finish or skip the profile setup step.

Invite and password reset emails work with Railway Postgres accounts when an email provider is configured. The simplest MVP provider is Resend: set `RESEND_API_KEY`. Without `WORKFLOW_EMAIL_FROM`, AirGSA uses `AirGSA <onboarding@resend.dev>` for testing, which Resend only allows to send to the email address of your own Resend account. To send to real Airline/GSA users, verify a domain in Resend and set `WORKFLOW_EMAIL_FROM=AirGSA <noreply@your-domain.com>`. SMTP (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`) and `WORKFLOW_EMAIL_WEBHOOK_URL` are also supported.

Customer RFQ email extraction in `/gsa/quotes` uses `OPENAI_API_KEY` when configured and falls back to local rule extraction when absent. Set `OPENAI_QUOTE_EXTRACTION_MODEL=gpt-4.1-mini` unless you want to test another OpenAI model.

`LINKEDIN_IMPORT_API_URL` is the POST endpoint of your LinkedIn import provider. The app sends the import settings to this endpoint and expects either an array of posts or a response object with `data`, `items`, `results`, `posts`, or `output`.

LinkedIn imports are batched internally in groups of 6 target URLs because the upstream provider only accepts 6 targets per request. This is hidden from admins in the UI. Admins choose sources, import lookback such as "last 24 hours" or "last 2 weeks", and an automatic schedule such as "every 12 hours" or "every 1 week". Imported posts can stay unclassified for manual review. OpenAI classification is intentionally not automatic because model calls are paid API usage.

## Database

The plain Postgres schema is in:

```bash
db/schema.sql
```

It includes the requested tables, enums, indexes, and RLS policies. Apply `db/migrations` to Railway Postgres before production deploys.

```bash
npm run db:migrate
npm run check:migrations
```

For file uploads on Railway without another provider, mount a Railway volume and set `RAILWAY_VOLUME_MOUNT_PATH` or `ATTACHMENT_STORAGE_ROOT`.

## Useful Routes

- `/` landing page
- `/login`
- `/signup`
- `/role-selection`
- `/airline`
- `/airline/tenders`
- `/airline/applications`
- `/airline/performance`
- `/gsa`
- `/gsa/tenders/tnd-eur-001`
- `/news`
- `/news/sources`
- `/admin`
