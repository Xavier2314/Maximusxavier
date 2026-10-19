# Maximus — handover notes

Live app: https://maximus-nine-sepia.vercel.app (Vercel project `maximus`, team `bridgepoint010-9599`).
Code: this folder, branch `claude/busy-brown-w2nxvn` of `Xavier2314/Maximusxavier`.
Database: Supabase project `ngbjtfyctxgteebiinjn`. Owner / Super Admin: Valentine Aluele (MX-001001).

## Stack
- Next.js 15 (App Router, server actions) on Vercel; Tailwind v4; Recharts.
- Supabase Postgres with Row Level Security on every table. Access rules live in SQL
  (`supabase/migrations/*.sql`), not only in the UI. Read `can_view_team_data`,
  `can_manage_office` and `manages_office_of` first.
- Claude (Anthropic SDK) for Maximus AI, form "talk to AI" modes, receipt checks and report fill-in.
- Vercel Cron: `/api/cron/daily` (06:00 UTC) and `/api/cron/followups` (09:00 UTC).

## Running the database tests
```
service postgresql start
sudo -u postgres createdb mx_test
cat supabase/tests/00_supabase_stub.sql supabase/migrations/*.sql \
  <(grep -v "streak counts today" supabase/tests/01_security_tests.sql) \
  | sudo -u postgres env PGTZ=Africa/Lagos psql -v ON_ERROR_STOP=1 -q -d mx_test -f -
```
A clean run ends with `ALL SECURITY TESTS PASSED`. Add a test for every new rule.

## Applying migrations
All migrations up to `0034_online_payments` are applied to the live database (0030 schedules hourly
check-in reminders with pg_cron).
The Supabase MCP connection times out on large scripts and on anything containing a
DELETE statement (it waits for a confirmation). Apply big migrations in pieces, or paste
them into Supabase > SQL Editor.

## What the app does (main areas)
- My view vs Office view (office managers) / Team view (sponsors and leaders); the
  switch is in the sidebar. Nav lives in `src/components/shell/nav.ts`.
- Team tree (closure table `team_relationships`), sponsor line sees everything below,
  never above. Uplines can add photos for, and remove, people who left (`remove_from_team`).
- Roles: Member, Team Leader, Director, Office Admin, Admin (executive_admin), Super Admin,
  plus Earnings Manager. Switch roles from a member's page or Members & roles.
- Business status (Newbie … Five Diamond Director) on profiles; NeoLife ID in
  `member_private` (visible up the line and to admins only).
- Attendance (GPS + rotating QR), register, reports (CSV / print-to-PDF), coaching alerts.
- Goals, evaluations, orders, savings/payments ledger, prospects with AI follow-up,
  My Why, Daily Planner, Academy, announcements, support tickets.
- Office branding (logo, colours, name) per office; platform white-label for Super Admin.
  Removing "Powered by" costs a one-off ₦5,000 (bank details in `app_settings.white_label_fee`);
  offices upload a receipt, Claude pre-checks it, a Super Admin approves in
  Organisation > White-label payments.
- Weekly office report (Office view > Weekly office report): AI or form, last weeks carried
  over, branded printable PDF at `/print/office-report/[id]`.

- Tools (one container at `/tools`, category cards open the tools inside):
  - Focus & time: Pomodoro, focus mode, deep work, countdown, stopwatch, time blocking, time
    audit, 2-minute challenge. Timers store start/pause timestamps (`focus_sessions`), so time
    survives refreshes and closed tabs. Time is never counted as goal progress.
  - Goals & productivity: goal tracker (`tool_goals`, separate from official monthly goals),
    habits, productivity score (`productivity_score()`, 40% tasks, 30% goals, 30% habits),
    Eisenhower matrix (moves change task priority/due date), reflection & journal, streaks.
  - Accountability: partner codes (ACC-XXXXXX), mutual requests, one active partner, per-person
    sharing switches, check-ins, comments/encouragement/deadline suggestions (owner decides).
  - Private chat (`/messages`): partner chat plus sponsor-line chats (anyone directly above or
    below in the tree, `open_team_chat`). Only the two people can read a conversation; no admin
    policy exists on purpose. Not end-to-end encrypted. Reports carry only the reported message.
  - Brain gym (`/tools/brain`): 20 games, scores in `game_scores`. Brain training for fun,
    not a clinical test.

- Online payments (Flutterwave **v3** API, `src/lib/flutterwave.ts`): white-label fee and savings /
  contributions. Needs `FLUTTERWAVE_SECRET_KEY` (FLWSECK-…) and `FLUTTERWAVE_WEBHOOK_HASH` in Vercel;
  the "Pay online" buttons stay hidden until the secret key is set. Flutterwave's webhook (V3, header
  `verif-hash`) points to `/api/payments/flutterwave/webhook`; members return to
  `/api/payments/flutterwave/return`. Both re-check the payment with Flutterwave before
  `apply_online_payment()` (service role only, idempotent) unlocks white-label or writes a confirmed
  ledger entry. Bank transfer + receipt upload remain as a fallback.

- Payouts (Bank page → Payouts admin page) need a static outbound IP: Flutterwave rejects transfers from
  non-whitelisted IPs and Vercel IPs change. Set `FLUTTERWAVE_PROXY_URL` (e.g. Fixie / QuotaGuard) and add
  the proxy's IPs under Flutterwave → Settings → Whitelisted IP addresses. Only /transfers and /balances
  calls use the proxy.

- Every member who belongs to an office has an Office view tab with a read-only "My office" page
  (/office/my): head counts, leaders, office news, top earners. Data comes from
  `office_public_summary()` (0039), which returns totals only.

- Calls (0040): voice/video in private chats (📞/🎥 in the chat header) and office calls started by
  office managers from /calls. Media runs on Daily.co; set `DAILY_API_KEY` in Vercel. Only chat members
  (or that office's members) can get a room token.

- Watch party (0041): members turn a YouTube link into a public page at /w/<slug> (no login needed).
  "Watch together" syncs viewers to the host over Supabase Realtime broadcast. Rooms are read on the
  server with the service role; views are counted by `watch_room_viewed()` (service role only).

- Featured video: a Super Admin sets it at /admin/featured-video (app_settings key `featured_video`).
  Everyone sees it on Home, in the side menu, and once as a pop-up per new video (if pop-up is on).

- Upwork Account Analyser (0042, /tools/upwork): paid tool. ₦1,000 (app_settings `upwork_analyser_price`)
  through the in-app Flutterwave checkout unlocks it automatically (`tool_access`). Members who pay on the
  Flutterwave page link are unlocked by an approver on the same page (`grant_tool_access`). Reports use
  Claude with a forced tool call; 5 analyses per 24 hours per member (Super Admins unlimited).

- Top earners of the week (0043): every Monday the daily cron runs `award_weekly_winners()` (top 3 +
  each office's #1 from confirmed/delivered orders of the previous Mon–Sun), posts recognitions and
  notifies everyone. Home shows the banner all week. The Upwork analyser lists niche leaders via
  `upwork_niche_leaders()` (Upwork orders, last 90 days, pending included).

- Self-serve company white-label (0044): public link /white-label. A company creates its admin login,
  pays `company_whitelabel_fee` (₦5,000) via Flutterwave, and `provision_company()` creates its branded,
  white-labelled office with the payer as office admin. Members join via /register?office=<id>&ref=<code>
  (shown after payment and on the Branding page). Companies share the platform: Super Admins can see them.

- Featured video accepts YouTube or Loom. White-labelled companies set their own (offices.featured_video,
  Branding page); it replaces the platform video for their members.
- Two company offers (0045): Standard ₦5,000 / Premium ₦10,000 (`company_whitelabel_premium_fee`).
  Premium sets offices.full_white_label: company link /c/<slug> sets the `mx-brand` cookie so sign-in and
  sign-up pages show only the company; in-app "Maximus" menu names and the assistant use the company name,
  and the platform featured video is hidden.

## Known follow-ups
- Tools stage 5 is not built yet: team challenges arena, tools leaderboards, badges, AI
  productivity coach, flashcards, focus music, motivational challenge, smart reminders.
- Timer alerts play while the app is open or in the background; a timer finishing while the
  phone is fully closed shows on reopening (server-side timer push isn't implemented).
- Check-in reminders create in-app notifications on the hour; their push is sent by the next
  push sweep (daily crons), unless a Supabase webhook calls `/api/push/dispatch`.
- Registration now creates confirmed accounts on the server (no confirmation email), so the
  Supabase email rate limit can't block sign-ups. Password-reset emails still use Supabase's
  built-in email service, which allows only a few emails per hour. For real volume, set up
  custom SMTP (e.g. Resend or Brevo) in Supabase > Authentication > Emails > SMTP settings.
- Ascend Foundation, Supermind and Richies-Blazers have no GPS coordinates yet
  (set them in Office view > Office setup & QR) so their check-ins can't be location-verified.
- Login/registration pages and the installed-app icon still use the Maximus brand.
- Maximus Bank is a "coming soon" page; it needs a licensed partner (e.g. Paystack) and keys.
- `npm` registry is blocked in the build sandbox used so far, so type-checking happened on
  Vercel builds. Run `npm ci && npx tsc --noEmit && npx next lint` locally when you can.
- Browser errors are reported to `/api/client-error` and appear in Vercel runtime logs as
  `[client-error]`.
