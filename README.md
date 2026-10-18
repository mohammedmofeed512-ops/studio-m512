# Studio M512

منصة خاصة لإدارة ما قبل الإنتاج — من السيناريو حتى ورقة الاستدعاء — بالعربية والإنجليزية.
A private pre-production platform — from script to call sheet — in Arabic and English.

## Stack

- **Next.js 16** (App Router, Server Actions, `src/proxy.ts` for auth)
- **Supabase** — Postgres with row-level security, Auth (project `studio-m512`, eu-central-1)
- **Tailwind CSS 4** — design tokens in `src/app/globals.css`
- Bilingual UI: `src/lib/i18n/dictionaries.ts`, language stored in a `locale` cookie and the user's profile; `dir` switches between RTL and LTR

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and publishable key
npm run dev                  # http://localhost:3000
```

In Supabase → Authentication → URL Configuration, set **Site URL** to where the app runs
(`http://localhost:3000` locally, your Vercel URL in production) and add
`<site>/auth/callback` to **Redirect URLs**, so sign-up confirmation emails land back in the app.

## Deploy (Vercel)

1. Import this repository in Vercel.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as environment variables.
3. Update the Supabase Site URL and Redirect URLs to the Vercel domain.

## Database

Migrations live in `supabase/migrations/`. Every table carries `owner_id` and an RLS policy that
limits each signed-in user to their own rows. Client and crew access through share links will be
added later through security-definer functions.

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Sign-in, dashboard, projects, tasks, contacts, settings, Arabic/English | ✅ |
| 2 | Arabic screenplay editor, AV scripts, import, PDF export, revisions | next |
| 3 | Breakdown, shot lists, storyboards, lookbooks | |
| 4 | Stripboard, shoot days, call sheets, sending and tracking | |
| 5 | Client share links, comments and approvals, mobile polish | |
| later | Budget and crew rates | |
