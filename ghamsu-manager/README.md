This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Scheduled jobs

Vercel's Hobby plan only allows daily cron schedules and caps a project at 2 cron jobs, so this project runs on **one** Vercel cron plus one job pinged externally.

### `/api/cron/daily` — the one Vercel cron

Declared in `vercel.json`, runs daily at **06:00 UTC**:

```json
{ "path": "/api/cron/daily", "schedule": "0 6 * * *" }
```

It always runs birthday greetings (`runBirthdays`, from `lib/cron/birthdays.ts`), and additionally runs the Sunday attendance analysis email (`runWeeklyAnalysis`, from `lib/cron/weekly-analysis.ts`) when the day is Monday (UTC). Vercel calls it with `Authorization: Bearer ${CRON_SECRET}` automatically — the route 401s without that header.

### `/api/cron/email-scheduler` — pinged externally, not a Vercel cron

This one needs sub-daily frequency (checking for due scheduled email blasts every ~15 minutes), which Hobby doesn't allow as a Vercel cron. Set it up by hand at **[cron-job.org](https://cron-job.org)** (or any similar service):

- **URL**: `https://<your-production-domain>/api/cron/email-scheduler`
- **Method**: `GET` — must match whatever method the route currently exports; check the file if you change it
- **Schedule**: every 15 minutes
- **Header**: `Authorization: Bearer <CRON_SECRET>` (same secret as the Vercel env var)

It's safe to ping this on overlapping schedules or trigger it manually while one run is still in flight — `runEmailScheduler()` (in `lib/cron/email-scheduler.ts`) claims due blasts atomically in a single `UPDATE ... WHERE ... RETURNING` before sending, so two concurrent calls can't both pick up and send the same blast.

### Testing on demand

Hobby cron timing isn't precise, and cron-job.org runs on its own schedule — for testing without waiting, `POST /api/admin/run-cron` (national president only, requires a logged-in session) runs any of the three jobs immediately and returns its result: `{ "task": "birthdays" | "weekly_analysis" | "email_scheduler" }` in the request body.

## Authentication

Login is email + password via Supabase Auth (`supabase.auth.signInWithPassword`) — no public signup, accounts are invite-only, sessions are httpOnly cookies.

MFA was removed at tag `pre-mfa-removal`; to re-introduce it, start from that tag's `lib/rbac.ts` and `app/login/page.tsx`, or re-implement using Supabase Auth MFA (enroll/challenge/verify + AAL2 assertion in getScopedContext).

⚠️ **Launch consideration:** decide on MFA before importing real member data. The app holds personal data on thousands of students and password-only auth is a real risk at launch — this is currently unresolved.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
