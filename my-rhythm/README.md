# MY RHYTHM

**Structure Your Days. Build Your Future.**

My private, AI-powered life planner: an installable iPhone/Mac web app with my real weekly routine, server-sent phone reminders, conflict-aware scheduling, and spaces for Bible study, fitness, keyboard, podcast and habits.

> **Status, plainly:** the app is fully built and tested in code (52 automated tests, production build passing, UI checked at iPhone and Mac sizes). It is **not deployed yet**. Deploying needs your own accounts and keys (Supabase, Vercel, optional Anthropic), so you have to do that part. The steps are in [Deployment](#deployment-step-by-step). Notification behaviour on your actual iPhone has **not** been verified yet and can only be checked on the device ([Device tests](#tests)).

---

## Contents
1. [What it does](#what-it-does)
2. [Architecture](#architecture)
3. [Deployment, step by step](#deployment-step-by-step)
4. [Install on iPhone & turn on notifications](#install-on-iphone--turn-on-notifications)
5. [What iPhone notifications can and can't do](#what-iphone-notifications-can-and-cant-do)
6. [Troubleshooting](#troubleshooting)
7. [Costs](#costs)
8. [Tests](#tests)
9. [Development](#development)

---

## What it does

| Area | Highlights |
|---|---|
| **Today dashboard** | Greeting, live clock, motivation, current and next activity with a countdown, a timeline of the day, daily and weekly progress, habit streaks, next reminders, upcoming commitments, completed and missed lists, Quick Add and Ask AI. Tap any activity to Start, Complete, Skip, Snooze (5/10/15/30), Reschedule, Edit, Duplicate, Delete, edit its reminders, or tick its checklist. A timer runs while an activity is in progress. |
| **Timer** | Stopwatch (with laps) and countdown (presets 5–90 min or custom). It keeps running if you leave the page or close the app. A countdown schedules a server push, so your phone is alerted when it ends even with the app closed; with the app open you also hear your in-app sound. Link it to one of today's activities: Start marks it in progress, and Finish marks it complete with the real time spent. There's an optional keep-screen-on setting and a recent-timings list. Open it from Today, from any activity, or More → Timer. |
| **Talk it through** | Tap the mic (on Today or in Quick Add) and say everything you want to do: tasks, reminders, trips, keyboard practice, meetings, repeating habits. The AI turns it into a task list. Times you said are kept, and anything without a time goes into your next free slots. You review and approve it, and each item then reminds you ("It's 2:00 PM — time for …"). The Ask AI chat can do the same, and has a mic plus an option to read replies aloud. |
| **AI voice coach** | While the Timer runs, it speaks to you: a start line, halfway, 5 minutes, 1 minute, "You are doing very great. You have just ten seconds to complete your task", 3-2-1, and a finish line. The AI writes lines specific to your task, with built-in lines as a fallback. When a reminder arrives with the app open, it's read out loud and offers **Start timer for this**. Speech works while the app is open on screen; iOS needs one tap first. |
| **Calendar** | Day, week, month and agenda views, colour-coded by category. Drag to move an activity on a Mac (15-minute steps, conflict check first); on iPhone, tap it and choose Reschedule. Edit or delete one occurrence, this and following, or the whole series. Exceptions, multi-day and all-day events, and activities crossing midnight are supported. |
| **Quick Add** | Three ways to add: **manual** form (every field: category, priority, flexibility, repeat, reminders, prep/travel/recovery time, notes); **Ask AI** in plain English; **Voice** (speech recognition, or the iPhone keyboard's dictation key as a fallback). Every addition shows a preview with conflicts and must be approved before anything is saved. |
| **AI scheduling assistant** | A deterministic engine computes overlaps, buffer problems, sleep cuts, overload, missing rest, duplicates and free slots. It recommends by classification: **fixed** items are flagged, never moved; **essential** items are kept the same day; **flexible** items are moved to a free slot; **optional** items are skipped. Claude only explains and ranks these recommendations. The review screen shows Original / Proposed / Conflicts / Recommendations / Reasons, with Approve all, Approve selected, Modify and Reject. Every change goes into the audit history and can be undone. |
| **Ask MY RHYTHM** | Chat that reads your real schedule and records through tools (schedule, availability, free time, progress). It can only *propose* changes, which you then approve. |
| **Reminders** | Real Web Push (VAPID) sent by a server-side scheduler every minute, so it works with the app closed. Your exact reminder messages are included (4:55, 5:00 and 6:00 devotion; gym at 6:15, 6:30, 7:00 and 8:00; lessons, practice, office, podcast; 8:30 and 9:00 PM bedtime; Sunday 4 PM review; optional morning agenda). |
| **Reminder Center** | Permission, install, subscription and scheduler status; a 10-step iPhone setup assistant; test now; test in 1 minute (proves delivery with the app closed); upcoming and sent history with per-device "received" receipts; devices; per-category switches; in-app alarm sound; limitations and troubleshooting. |
| **Spiritual** | Reading-plan generator (whole Bible, NT, Gospels, Psalms & Proverbs, custom), today's chapters, reading progress and streak, prayer journal (mark answered), reflections, gratitude, sermon notes, saved verses. Passage text comes only from the public-domain World English Bible (via bible-api.com) or from what you paste yourself; no Scripture is generated. |
| **Fitness** | Upcoming gym sessions, workout log (type, sets, reps, weight, rest, duration, energy, notes, recovery), exercise library, weekly consistency chart, strength trend. No medical advice. |
| **Keyboard** | Practice timer, practice log, lesson notes and attendance, "convert notes into practice tasks", repertoire (chords, scales, songs, exercises, skills, milestones), weekly report, and "find time for extra practice". |
| **Podcast** | Idea capture, board by stage (with custom stages), research, outline, script, recording and editing checklists, deadlines and publish dates, production calendar, tasks, and "find time to record/edit". |
| **Habits** | Default habits plus your own. Daily, weekly and monthly completion, current and longest streak, 8-week chart. Completing a linked activity records the habit. Nothing is ever recorded automatically without your action. |
| **Travel mode** | Trip form → analysis of the whole trip period → flags, moves and skips suggested by priority, a packing/preparation block the day before, devotion kept, and an easy return evening. Travel times are only your own estimates; nothing is invented. |
| **Weekly review** | Spiritual consistency, gym, lessons, practice hours, office, podcast, habits, missed items, schedule changes, sleep (when recorded), and gentle suggestions for next week. |
| **Settings** | Profile, timezone, wake and bed times, devotion time, gym days, routine editor, priorities, category colours and ranks, focus hours, protected rest, daily limits, theme, AI on/off, service status, export/restore backup, delete all data, sign out. |

**Your routine is created automatically** on first sign-in: devotion 5–6 AM every day; gym mornings Mon/Wed/Fri/Sat (6:00 prepare, 6:30 travel, 7:00 workout, 8:00 return, 8:30 recovery); keyboard lessons Mon 10–12, Tue and Thu 1–3; practice Mon 1, Wed 10, Thu 9, Fri 10, Sat 11; office Mon–Fri 4–7 PM **starting 19 Oct 2026**; podcast Tue 9–11, Fri 11–12, Sat 1–3; Sunday weekly review 4 PM. Sunday 6 AM–4 PM is protected rest by default. Wake time is 5:00 AM and bedtime 9:00 PM. All of it is editable.

## Architecture

```
iPhone / Mac (installed PWA)            Vercel (Next.js 15, TypeScript)              Supabase
┌──────────────────────────┐   HTTPS   ┌────────────────────────────────┐   RLS   ┌───────────────┐
│ React UI · Tailwind      │──────────▶│ API routes (auth-checked)      │────────▶│ Postgres      │
│ Service worker (sw.js)   │           │  • scheduling engine (pure TS) │         │ Auth          │
│  • push → notification   │◀── push ──│  • proposals / apply / undo    │         │ pg_cron ──┐   │
│  • offline cache         │           │  • Claude (server-side only)   │         └───────────┼───┘
└──────────────────────────┘           │  • /api/cron/tick ◀──────────── every minute ───────┘
          ▲                            │      plan 48 h → claim due →   │
          │ Apple/Google push service  │      web-push (VAPID)          │
          └────────────────────────────┴────────────────────────────────┘
```

- **Scheduling engine** (`src/lib/schedule/`): recurrence expansion on local dates (so times stay right across DST when you travel), exceptions, conflict detection, free-slot search, recommendations, and proposal apply with validation and audit history. It is deterministic and fully unit-tested.
- **Reminder pipeline** (`src/lib/reminders/`): the planner diffs desired reminders against stored ones. It is idempotent: a `UNIQUE(user_id, dedupe_key)` constraint plus a `FOR UPDATE SKIP LOCKED` claim function mean **no duplicate alerts**. Changes re-plan immediately. Cancelled activities cancel their reminders, and completed activities suppress follow-ups. Reminders more than 30 minutes late (after an outage) are expired, not sent.
- **Security**: one allowed email (`ALLOWED_EMAILS`), checked in middleware and in every API route. Row Level Security is on every table. All keys stay server-side. Push actions use signed, per-reminder tokens. AI tools can only read or create *pending* proposals, and text from your events is treated as data, not instructions.
- **Database**: `supabase/migrations/20261014000001_init.sql` (users and profiles, preferences, categories, activities with recurrence rules, exceptions, completions, reminder rules, scheduled reminders, push subscriptions, delivery logs, Bible plans and progress, prayer journal, reflections, verses, workouts, sets, exercises, lessons, practice sessions, music items, practice tasks, podcast stages, episodes and tasks, habits and completions, trips, AI conversations and messages, proposals, change history).

---

## Deployment, step by step

You need about 45 minutes, a computer, and these free accounts: **GitHub** (you have it), **Supabase**, **Vercel**, and optionally **Anthropic** (for the AI).

### 1. Create the database (Supabase)
1. Go to <https://supabase.com> → **New project**. Name it `my-rhythm`, pick a strong database password, and choose a region near Lagos (e.g. *West EU (London)*).
2. When it's ready, open **SQL Editor → New query**. Open the file `my-rhythm/supabase/migrations/20261014000001_init.sql` from this repo, copy everything, paste it, and press **Run**. You should see "Success".
3. **Authentication → Sign In / Providers → Email**: keep Email enabled and **turn OFF "Allow new users to sign up"**. This is a private app.
4. **Authentication → Users → Add user → Create new user**: enter your email and a strong password, and tick **Auto Confirm User**.
5. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key. Keep the service_role key secret.

### 2. Generate your keys
On any computer with Node.js 20+ installed:
```bash
git clone https://github.com/xavier2314/maximusxavier.git
cd maximusxavier/my-rhythm
npm install
npm run vapid          # prints NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY
openssl rand -hex 32   # run twice: one for CRON_SECRET, one for PUSH_ACTION_SECRET
```
(No terminal? Any VAPID key generator works, e.g. <https://vapidkeys.com>, and any long random string works for the secrets.)

### 3. (Optional) AI key
Go to <https://console.anthropic.com> → **API keys → Create key**, and set a monthly spend limit (e.g. $10). Without a key everything still works: Quick Add uses the built-in parser, and the chat assistant shows a "not configured" message.

### 4. Deploy the app (Vercel)
1. Go to <https://vercel.com> → **Add New → Project** → import `xavier2314/maximusxavier`.
2. Set **Root Directory** to `my-rhythm`. The framework is detected as Next.js.
3. Under **Environment Variables**, add (see `.env.example`):

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key |
| `ALLOWED_EMAILS` | your email (the one from step 1.4) |
| `NEXT_PUBLIC_APP_URL` | your Vercel URL, e.g. `https://my-rhythm.vercel.app` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | from step 2 |
| `VAPID_PRIVATE_KEY` | from step 2 |
| `VAPID_SUBJECT` | `mailto:your@email` |
| `CRON_SECRET` | random string from step 2 |
| `PUSH_ACTION_SECRET` | the other random string |
| `ANTHROPIC_API_KEY` | from step 3 (optional) |
| `ANTHROPIC_MODEL` | optional; leave empty for `claude-opus-5-5`, or `claude-sonnet-5-5` to halve the cost |

4. Press **Deploy**. Open the URL, sign in, and your routine is created automatically.
5. In Supabase → **Authentication → URL Configuration**, set **Site URL** to your Vercel URL so magic-link emails come back to the app.

### 5. Start the background scheduler (required for phone reminders)
In Supabase → **SQL Editor**, open `my-rhythm/supabase/cron.sql`, replace `YOUR-APP-URL` and `YOUR-CRON-SECRET`, and press **Run**. It calls the app every minute. Within 2 minutes, **Reminder Center → Scheduler** should say "Ran just now".

*Alternative (if you'd rather not use pg_cron):* a free <https://cron-job.org> job every minute, `POST https://YOUR-APP/api/cron/tick`, header `Authorization: Bearer YOUR-CRON-SECRET`. Vercel's own cron is limited to once a day on the free plan, so it can't drive minute-level reminders.

## Install on iPhone & turn on notifications
(Requires **iOS 16.4 or later**.) The **Reminder Center** in the app walks you through this with live checkmarks.
1. Open your app URL in **Safari**.
2. Tap **Share → Add to Home Screen → Add**.
3. Open **MY RHYTHM from the Home Screen icon**. Push only works there, not in a Safari tab.
4. Go to **Reminders** → **Enable notifications** → tap **Allow**.
5. iPhone **Settings → Notifications → My Rhythm**: Allow Notifications, **Sounds on**, Lock Screen, Banners. Check that no **Focus** mode blocks it.
6. Tap **Test notification**. A banner should appear.
7. Turn the ring switch **on**, test again, and confirm you **hear** it.
8. Tap **Send test reminder in 1 minute**, then close the app and lock the phone. It should arrive on the Lock Screen.
9. Record each result with the Yes/No buttons in the setup assistant.
10. On your MacBook, open the site in Safari or Chrome and **Enable notifications** there too (optional). Each device is listed under Devices.

## What iPhone notifications can and can't do
- ✅ Lock Screen and banner notifications, the **standard iOS notification sound**, an app-icon badge, and delivery while the app is closed (sent by the server).
- ❌ Custom sounds, continuous ringing like an alarm, overriding Silent mode or Focus, or playing audio while the app is closed. Web apps can't do these on iOS, and MY RHYTHM doesn't pretend otherwise.
- ⚠️ Action buttons (Snooze / Done) show on platforms that support them (e.g. Mac Chrome). On iPhone, tap the notification, and the app opens on that activity where you can act.
- 🔔 **Need a real alarm at 4:55 AM?** Set it in the iPhone **Clock** app, or create an **Apple Shortcuts** personal automation: *Time of Day 4:55 AM, Daily → Open URL (your app)*. MY RHYTHM's reminders then complement it.
- 🎵 While the app is open on screen, an optional **in-app alarm overlay with sound** (chime, bell, pulse or gentle) plays when a reminder arrives. Turn it on in the Reminder Center; one tap is needed to allow audio.
- "**Accepted**" in the history means Apple's push service accepted the message. "**Received**" means your phone's app confirmed it arrived and asked iOS to show it. Neither proves the alert was *audible*; only you can confirm that.

## Troubleshooting
| Symptom | Fix |
|---|---|
| "Enable notifications" does nothing on iPhone | Open the app from the **Home Screen icon**, not Safari. Update to iOS 16.4+. |
| Permission shows **Blocked** | iPhone Settings → Notifications → My Rhythm → Allow. If it isn't listed, delete the Home Screen app, re-add it, and enable again. |
| Test works but scheduled reminders don't | Reminder Center → Scheduler should be under 5 minutes old. Re-check step 5 (wrong URL or secret shows as `401` in `net._http_response`). |
| History shows "accepted" but no "received" | Tap **Re-register device**, then test again. Check that Low Power Mode and Focus aren't hiding it. |
| No sound | Ring switch on, Settings → Notifications → My Rhythm → Sounds on, and not in Focus. |
| Sign-in says "not allowed" | The email must exactly match `ALLOWED_EMAILS`. |
| Login page says "server isn't configured" | Supabase env vars are missing in Vercel. Redeploy after adding them. |
| AI assistant "not configured" | Add `ANTHROPIC_API_KEY` in Vercel, then redeploy. |

## Costs
| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby (personal use) | **$0** |
| Supabase | Free (500 MB DB, pg_cron + pg_net included) | **$0**. The every-minute scheduler keeps the project active. Pro is $25/mo if you ever need backups/PITR. |
| Web Push (Apple/Google) | — | **$0** |
| Anthropic Claude API | Pay as you go | Default `claude-opus-5-5` ($4 / $20 per million input/output tokens). Rough guide: a Quick Add parse is about $0.01–0.02, and an assistant question with tool lookups about $0.03–0.10. Typical personal use is **~$2–8/month**. Set `ANTHROPIC_MODEL=claude-sonnet-5-5` to roughly halve it. A console spend limit caps it. |
| Domain (optional) | — | ~$10–15/year |

---

## Tests

Run them with `npm test`. **52 automated tests** cover:

| # | Requirement | Covered by | Result |
|---|---|---|---|
| 1 | Login works / single user | middleware + route guard; manual check after deploy | ⏳ verify after deploy |
| 2 | Private data is secure | `database.test.ts`: RLS blocks another user's reads/updates/deletes and inserts as owner; anon blocked; claim function not callable by users | ✅ |
| 3–8 | Routine loads; devotion daily; gym only M/W/F/S; lesson times; office from 19 Oct 2026; podcast | `schedule.test.ts` | ✅ |
| 9–11 | Create activities; edit recurring (exceptions, until/count/interval); conflicts detected | `schedule.test.ts`, `database.test.ts` | ✅ |
| 12–14 | AI suggestions use the real calendar; nothing changes without approval; one choice per item | `schedule.test.ts` (Abuja trip from seeded calendar, fixed never cancelled by default) | ✅ |
| 15–17 | Reminders update after reschedule; cancelled → none; no duplicates; completed → suppressed | `reminders.test.ts`, `database.test.ts` | ✅ |
| 18 | Data persists | `database.test.ts` | ✅ (real persistence verified after deploy) |
| 19 | Mobile layouts | `scripts/ui-check.ts`: 15 pages at 390×844 light/dark + 1440×900, no errors or horizontal overflow | ✅ |
| 20–23 | iPhone receives test push; Lock Screen; audible; arrives with app closed | **Real-device only.** Use the Reminder Center setup assistant | ❌ **not yet tested on your iPhone** |
| 24 | Africa/Lagos timing (4:55 AM = 03:55 UTC), DST-safe | `reminders.test.ts`, `schedule.test.ts` | ✅ |
| 25 | In-app timers | dashboard countdown and activity timer (UI) | ✅ rendered in UI check |
| 26 | Stats from real data only | `parsing-and-stats.test.ts` | ✅ |

**What I need you to do** (only you can do this): after deploying, complete steps 1–10 of the iPhone setup assistant, then test once the next morning that the 4:55 AM devotion reminder arrives with the phone locked.

## Development
```bash
cp .env.example .env.local    # fill in values
npm install
npm run dev                   # http://localhost:3000
npm test                      # unit + database tests (PGlite, no server needed)
npm run typecheck && npm run lint && npm run build
npm run icons                 # regenerate app icons
```
Folder map: `src/app/(app)/*` pages, `src/app/api/*` API routes, `src/lib/schedule` engine, `src/lib/reminders` planner and dispatcher, `src/lib/ai` Claude integration and fallback parser, `src/lib/seed/routine.ts` your routine, `public/sw.js` service worker, `supabase/` SQL, `tests/` tests, `scripts/ui-check.ts` UI smoke test.
