# AirGSA MVP

B2B  aviation cargo MVP built with Next.js App Router, TypeScript, TailwindCSS, shadcn-style UI primitives, Supabase-ready services, Recharts, and mock data.

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
4. Add environment variables only when Supabase is ready:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SESSION_SECRET=
LINKEDIN_API_TOKEN=
LINKEDIN_IMPORT_API_URL=
```

The MVP still runs with mock data if Supabase variables are empty.

`LINKEDIN_API_TOKEN` and `SUPABASE_SERVICE_ROLE_KEY` are server-side secrets. Do not expose them with a `NEXT_PUBLIC_` prefix.

`AUTH_SESSION_SECRET` signs the AirGSA session cookie. Set a long random value in production. Without Supabase configuration the app falls back to demo accounts; with Supabase configured, login uses Supabase Auth and reads the user's role/company from `public.users` and `public.companies`.

Set `ALLOW_DEMO_ACCOUNTS=true` only when you intentionally want demo logins to remain available in a deployed environment.

Supabase Auth password recovery is available through `/forgot-password` and `/reset-password`. In the Supabase dashboard, add your deployed domain to the allowed redirect URLs, including:

```bash
https://your-domain/reset-password
```

Admin approval of access requests provisions Supabase users when `SUPABASE_SERVICE_ROLE_KEY` is configured. The user receives a Supabase invite email and sets their own password.

`LINKEDIN_IMPORT_API_URL` is the POST endpoint of your LinkedIn import provider. The app sends the import settings to this endpoint and expects either an array of posts or a response object with `data`, `items`, `results`, `posts`, or `output`.

LinkedIn imports are batched internally in groups of 6 target URLs because the upstream provider only accepts 6 targets per request. This is hidden from admins in the UI. Admins choose sources, import lookback such as "last 24 hours" or "last 2 weeks", and an automatic schedule such as "every 12 hours" or "every 1 week". Imported posts can stay unclassified for manual review. OpenAI classification is intentionally not automatic because model calls are paid API usage.

## Supabase

The schema is in:

```bash
supabase/schema.sql
```

It includes the requested tables, enums, indexes, basic RLS policies, and a private `contract-documents` storage bucket.

## Useful Routes

- `/` landing page
- `/pricing`
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
