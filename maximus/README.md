# Maximus — Team Growth Platform

> Fulfilment in maximized potential.

Maximus is a mobile-first web app (installable on iPhone and Android as a PWA) for running a network-marketing organisation: team hierarchy, office attendance, monthly goals, five-day evaluations, savings and contributions, orders, notifications, recognition, an AI growth coach and a learning academy.

| Layer | Technology |
|---|---|
| App | Next.js (App Router) + TypeScript, hosted on **Vercel** |
| Styling | Tailwind CSS v4, hand-built components in the Maximus brand (logo manual colours; Jost as the Futura web fallback) |
| Backend | **Supabase**: Postgres, Auth, Storage, Realtime, Row Level Security |
| AI | Claude via the Anthropic API (server-side only) |
| Push | Web Push (VAPID) + service worker |
| Jobs | Vercel Cron → `/api/cron/daily` |
| Charts | Recharts |

Only **two accounts** are required to run it: Supabase and Vercel. Claude (AI) and push keys are optional extras.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (choose a region near Lagos, e.g. EU West).
2. **Run the migrations** — in *SQL Editor*, run each file in `supabase/migrations/` **in order** (0001 → 0009). Or with the Supabase CLI: `supabase link` then `supabase db push`.
3. **Auth settings** — *Authentication → URL Configuration*:
   - Site URL: your Vercel URL (e.g. `https://maximus.vercel.app`)
   - Redirect URLs: add `https://YOUR-DOMAIN/auth/callback`
4. **Realtime** — migration 0008 adds `notifications` and `attendance` to the `supabase_realtime` publication automatically.
5. **Storage** — migration 0008 creates the `avatars`, `receipts` and `academy` buckets with their policies.

### Create the first administrator
1. Register in the app (leave the sponsor code empty — you are the founder).
2. In Supabase *SQL Editor* run:
   ```sql
   select public.bootstrap_super_admin('your-email@example.com');
   ```
3. Sign out and back in. You now see the **Administration** menu. Create your offices first (Administration → Offices), then share your referral code.

## 2. Deploy on Vercel

1. *Add New → Project* → import the GitHub repo. Set **Root Directory** to `maximus`.
2. Add the environment variables below (Project → Settings → Environment Variables).
3. Deploy. The daily reminder job is configured in `vercel.json` (06:00 UTC = 07:00 Lagos).

## 3. Environment variables

See `.env.example` for the full list.

| Variable | Required | Where to get it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase → Project Settings → API (safe for the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase → Project Settings → API. **Server-only secret** — used only by the cron and push jobs |
| `NEXT_PUBLIC_SITE_URL` | Yes | Your app URL, e.g. `https://maximus.vercel.app` |
| `CRON_SECRET` | Yes | Any long random string (`openssl rand -hex 32`). Vercel Cron sends it automatically |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | For push | Run `npm run vapid` once; subject is `mailto:you@example.com` |
| `ANTHROPIC_API_KEY` | For AI | [console.anthropic.com](https://console.anthropic.com) |
| `MAXIMUS_AI_MODEL` | No | Override the AI model (default `claude-opus-5-5`; `claude-sonnet-5-5` is cheaper) |

Until a credential is set, the related feature shows a clear "not configured" notice — nothing pretends to work.

### Instant push delivery (recommended)
Push is sent right after actions that create notifications, and swept by the daily cron. For notifications created by database triggers (e.g. a new team registration), add a **Supabase Database Webhook**: *Database → Webhooks → Create*, table `notifications`, event `INSERT`, type HTTP `POST` to `https://YOUR-DOMAIN/api/push/dispatch` with header `Authorization: Bearer <CRON_SECRET>`.

**iPhone note:** iOS only delivers web push to apps added to the Home Screen (Safari → Share → *Add to Home Screen*, iOS 16.4+). Android works in Chrome directly.

## 4. Local development

```bash
cd maximus
cp .env.example .env.local   # fill in your Supabase values
npm install
npm run dev                  # http://localhost:3000
npm run typecheck
```

### Database security tests
The migrations ship with a test suite that exercises every RLS boundary (60+ checks: visibility across branches, self-approval, ledger immutability, cycle prevention, AI privacy…). It runs against a plain local PostgreSQL 15+:

```bash
npm run test:db   # needs createdb/psql on PATH
```

## 5. How security works

- **Every rule is enforced in Postgres**, not just hidden in the UI: Row Level Security on all 34 tables, column-level grants on `profiles`, and `SECURITY DEFINER` functions for sensitive writes (check-in, approvals, role changes, ledger).
- **Roles → permissions**: members can hold several roles; Sponsor, Upline and Downline are assigned automatically from the team tree. Only admins with `manage_roles` can grant elevated roles, and never at or above their own rank.
- **Team visibility** uses a closure table: leaders see only their own branch; cycles are rejected.
- **Money**: balances are always computed from an append-only ledger; entries can't be edited or deleted — corrections are adjustments or reversals, each audited. Self-reported entries stay pending until approved, and confirmed balances are labelled as organisation records, not bank balances.
- **Finance privacy**: leaders only see a member's finances if the member explicitly shares them.
- **AI privacy**: the assistant reads data with the member's own session, so it can never see anyone else's records; AI conversations are private even from admins; memory is opt-in and deleted when turned off.
- **Attendance**: GPS is read only on check-in/out with browser consent, and statuses never claim proof of physical presence.
- **NIN**: not collected. NIN verification is a disabled future module.

## 6. Project structure

```
maximus/
  supabase/migrations/   SQL schema, RLS, functions (run in order)
  supabase/tests/        local security test-suite
  public/                logo assets, PWA icons, service worker
  src/app/(auth)/        register, login, password reset
  src/app/(app)/         the signed-in app (dashboard, team, attendance, goals, …, admin)
  src/app/api/           AI chat, push, cron, CSV exports, receipts
  src/components/        design system, charts, brand logo
  src/lib/               auth/permissions, Supabase clients, push, AI, utilities
```

## 7. Testing checklist (manual)

1. Register a founder, bootstrap Super Admin, create an office with coordinates.
2. Register a second member with the founder's referral code → founder gets a notification and sees them in **My Team**.
3. As the member: check in (allow location), submit goals, complete an evaluation, submit a savings deposit with a receipt.
4. As the founder: approve the goals, comment on the evaluation, confirm the deposit in **Approvals** → member is notified and the balance updates.
5. Grant the member *Team Leader*, check the audit log.
6. Turn on push in **Settings** on a phone and repeat step 4.
