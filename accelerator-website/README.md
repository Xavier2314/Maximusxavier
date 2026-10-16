# Accelerator Community website

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Framer Motion · Supabase · Paystack · Vercel.

## Pages
| Route | Purpose |
|---|---|
| `/` | Home: hero, about preview, mission/vision/pillars, featured event, gallery, founder preview, impact, CTA |
| `/about` | Who we are, story, mission, vision, values, community culture, journey, achievements |
| `/founder` | Founder profile (photo, biography, vision, philosophy, message, quote) |
| `/events` | Accelerators Events 2026 landing page: countdown, highlights, tickets, speakers, awards, video competitions |
| `/events/register` | Registration form (draft fields) → review → Paystack |
| `/events/register/status` | Server-side payment verification and confirmation (success / pending / failed) |
| `/contact` | Contact details and contact form (honeypot + timing spam protection) |
| `/privacy`, `/terms`, `/refunds` | Policy drafts for review |
| `/admin` | Protected dashboard: stats, registrations, CSV export, tickets, event details, speakers, awards, contests, messages, audit log |

## Placeholders, not invented facts
Everything we have not received is `null` in `src/lib/site.ts` (mission, vision, story, founder, contact details, socials, CAC details, impact figures) or editable in the admin dashboard (event date, venue, theme, ticket prices, benefits, speakers, awards, contests). Null values render as a dashed **"Awaiting…"** label.

## Ticket windows (Africa/Lagos, UTC+1, no DST)
- **Early Bird**: open now until 31 Oct 2026 23:59:59 WAT (`2026-10-31T22:59:59.999Z`).
- **Late Registration**: opens 1 Nov 2026 00:00 WAT (`2026-10-31T23:00:00Z`).

Status is computed from the server clock on every request (`src/lib/tickets.ts`), so the switch is automatic. `/api/register` re-checks the window, the price and duplicate registrations on the server before creating a payment. Ticket cards also re-check every 30 s in the browser so an open page updates at midnight.

## Payments
1. `/api/register` validates input (zod), checks the sales window, stores a **pending** registration with a unique `ACC26-XXXXXXXX` reference, and initialises a Paystack transaction server-side.
2. Paystack redirects to `/events/register/status?reference=…`. That page **verifies with the Paystack API** (never trusts the redirect) and checks amount + currency.
3. `/api/paystack/webhook` (HMAC-SHA512 signature check) also confirms `charge.success`.
4. Confirmation is idempotent: a conditional update flips `pending → paid` once; only that call sends the email. A partial unique index allows one paid registration per email; a second payment is flagged `duplicate_paid` for refund review.

## Environment variables (Vercel → Project → Settings → Environment Variables)
See `.env.example`. Required for full functionality:
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `PAYSTACK_SECRET_KEY` (test key first, `sk_test_…`)
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` (32+ random characters)
- Optional: `RESEND_API_KEY`, `EMAIL_FROM`, `CONTACT_TO_EMAIL`

Without them the site still works; registration, payments, contact storage and admin show clear "being set up" messages.

## Database setup
Create a Supabase project (or add the Supabase integration from the Vercel Marketplace), then run `supabase/schema.sql` in the SQL editor. RLS is on for every table with no public policies; only the server uses the service-role key.

## Deploy
Vercel builds this as a standard Next.js project (`next build`). Set the environment variables, then redeploy. In Paystack set the webhook URL to `https://<domain>/api/paystack/webhook`.
