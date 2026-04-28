# AirGSA MVP

B2B aviation cargo MVP built with Next.js App Router, TypeScript, TailwindCSS, shadcn-style UI primitives, Supabase-ready services, Recharts, and mock data.

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
```

The MVP still runs with mock data if Supabase variables are empty.

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
