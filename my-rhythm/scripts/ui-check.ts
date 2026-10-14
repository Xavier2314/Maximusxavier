/**
 * UI smoke test & screenshots (developer tool, not part of the app).
 *
 * - Starts a tiny fake Supabase Auth endpoint so the middleware sees a signed-in owner.
 * - Serves API responses built from the REAL scheduling engine and seed routine
 *   (via Playwright request interception), so pages render realistic schedules.
 * - Captures iPhone-sized and desktop screenshots in light and dark mode.
 *
 * Usage: build with NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321, run `next start -p 3100`,
 * then `npx tsx scripts/ui-check.ts <outDir>`.
 */
import http from "node:http";
import { mkdirSync } from "node:fs";
import { chromium, type Page } from "playwright-core";
import { DateTime } from "luxon";
import { randomUUID } from "node:crypto";
import { CATEGORY_SEED, HABIT_SEED, buildSeedActivities } from "../src/lib/seed/routine";
import { expandDays } from "../src/lib/schedule/occurrences";
import { analyzeDrafts } from "../src/lib/schedule/analyze";
import { ActivityDraftSchema } from "../src/lib/schedule/draft";
import { planReminders } from "../src/lib/reminders/planner";
import type { ActivityRow, CategoryRow, Preferences, Profile, ReminderRuleRow } from "../src/lib/types";

const OUT = process.argv[2] ?? "ui-shots";
const BASE = process.env.BASE_URL ?? "http://localhost:3100";
const TZ = "Africa/Lagos";
mkdirSync(OUT, { recursive: true });

// ── fake auth ────────────────────────────────────────────────────────
const user = { id: "00000000-0000-0000-0000-000000000001", email: "owner@example.com", aud: "authenticated", role: "authenticated", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(req.url?.startsWith("/auth/v1/user") ? user : {}));
}).listen(54321);

// ── data from the real engine ───────────────────────────────────────
const now = DateTime.now().setZone(TZ);
const today = now.toISODate()!;
const categories: CategoryRow[] = CATEGORY_SEED.map((c) => ({ ...c, id: randomUUID() }));
const habitIds = Object.fromEntries(HABIT_SEED.map((h) => [h.key, randomUUID()]));
const built = buildSeedActivities(now.minus({ days: 10 }).toISODate()!, Object.fromEntries(categories.map((c) => [c.key, c.id])), habitIds, randomUUID);
const activities = built.map((b) => b.activity as ActivityRow);
const rules: ReminderRuleRow[] = built.flatMap((b) => b.rules.map((r) => ({ id: randomUUID(), activity_id: b.activity.id, anchor: r.anchor, offset_minutes: r.offset_minutes, message: r.message ?? null, enabled: true })));
const profile: Profile = { id: user.id, display_name: "Xavier", timezone: TZ, wake_time: "05:00:00", bedtime: "21:00:00", seeded_at: now.toISO() };
const preferences: Preferences = {
  theme: "system", notifications_enabled: true, bedtime_reminders_enabled: true, wind_down_minutes: 30, daily_agenda_enabled: true, daily_agenda_time: "04:45",
  weekly_review_enabled: true, in_app_sound_enabled: true, in_app_sound: "chime", ai_enabled: true, max_daily_hours: 11, min_buffer_minutes: 15,
  focus_hours: [{ days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "12:00" }], protected_rest: [{ days: [7], start: "06:00", end: "16:00", label: "Church, family & rest" }],
  priorities: ["Morning Bible devotion and spiritual growth", "Adequate sleep, health, and recovery", "Fixed office and keyboard commitments", "Gym, keyboard practice, and personal development", "Podcast production and flexible projects"],
};
// Screenshot-only completion states for today's past items (clearly test data, never shown to the user).
const devotion = activities.find((a) => a.group_key === "devotion")!;
const completions = [{ id: "c1", activity_id: devotion.id, occurrence_date: today, status: "completed" as const, started_at: null, completed_at: now.toISO(), duration_minutes: 55, notes: null }];
const data = { profile, preferences, categories, activities, exceptions: [], completions };

function decorated(from: string, to: string) {
  const comp = new Map(completions.map((c) => [`${c.activity_id}:${c.occurrence_date}`, c]));
  return expandDays(activities, [], from, to, TZ).map((o) => {
    const c = comp.get(o.key);
    const s = DateTime.fromISO(o.start), e = DateTime.fromISO(o.end);
    const state = c ? c.status : now >= s && now < e ? "now" : now >= e ? "missed" : "upcoming";
    const cat = categories.find((x) => x.id === o.categoryId)!;
    return { ...o, state, completion: c ?? null, category: { key: cat.key, name: cat.name, color: cat.color, icon: cat.icon } };
  });
}
const todayOcc = decorated(today, today);
const plan = planReminders({ data, rules, existing: [], now });
const trip = analyzeDrafts([ActivityDraftSchema.parse({ title: "Trip to Abuja", category_key: "travel", kind: "trip", start_date: now.plus({ weeks: 1 }).startOf("week").toISODate(), start_time: "09:00", duration_minutes: 33 * 60, classification: "fixed", location: "Abuja" })], data, { now, trip: { destination: "Abuja", prepMinutes: 60 } });

const routes: Record<string, unknown> = {
  "/api/bootstrap": { seeded: false },
  "/api/travel": { trips: [] },
  "/api/profile": { profile, email: user.email },
  "/api/categories": { categories },
  "/api/preferences": { preferences, services: { ai: true, push: true, cron: true } },
  "/api/dashboard": {
    now: now.toISO(), timezone: TZ, profile, motivation: "Start with God, and let the rest of the day follow.", today: todayOcc,
    current: null, next: todayOcc.find((o) => DateTime.fromISO(o.start) > now) ?? null,
    progress: { done: 1, total: todayOcc.filter((o) => !(o.groupKey === "gym-morning" && !/workout/i.test(o.title))).length, percent: 0 },
    week: { done: 1, due: 1, percent: 100 }, upcoming: [], flagged: [],
    habits: HABIT_SEED.map((h, i) => ({ id: habitIds[h.key], name: h.name, icon: h.icon, color: h.color, target_per_week: h.target_per_week, current: i === 0 ? 1 : 0, doneToday: i === 0, thisWeek: i === 0 ? 1 : 0 })),
    reminders: plan.inserts.filter((r) => r.kind === "activity").slice(0, 5).map((r, i) => ({ id: `r${i}`, title: r.title, body: r.body, fire_at: r.fire_at, kind: r.kind })),
    devices: 0, categories,
  },
  "/api/reminders": {
    pushConfigured: true, vapidPublicKey: "BExample",
    upcoming: plan.inserts.slice(0, 12).map((r, i) => ({ id: `u${i}`, kind: r.kind, title: r.title, body: r.body, fire_at: r.fire_at, status: "pending" })),
    recent: [], logs: [], devices: [], scheduler: { lastRunAt: now.minus({ minutes: 1 }).toISO(), notificationsEnabled: true },
  },
  "/api/proposals/demo": { proposal: { id: "demo", title: "Trip to Abuja", summary: "This conflicts with Keyboard lesson (Mon), Office training (Mon), Keyboard lesson (Tue), Office training (Tue) and more.", ai_explanation: null, payload: trip, status: "pending" } },
};

async function route(page: Page) {
  await page.route("**/api/**", async (r) => {
    const url = new URL(r.request().url());
    if (url.pathname === "/api/schedule") {
      const from = url.searchParams.get("from")!, to = url.searchParams.get("to")!;
      return r.fulfill({ json: { timezone: TZ, profile, categories, occurrences: decorated(from, to) } });
    }
    if (url.pathname.startsWith("/api/data/")) return r.fulfill({ json: { rows: url.pathname.endsWith("podcast_stages") ? ["Idea", "Researching", "Scripting", "Ready to Record", "Recording", "Editing", "Ready to Publish", "Published"].map((name, position) => ({ id: name, name, position })) : url.pathname.endsWith("habits") ? HABIT_SEED.map((h, i) => ({ id: habitIds[h.key], ...h, active: true, position: i })) : [] } });
    const body = routes[url.pathname];
    return body ? r.fulfill({ json: body }) : r.fulfill({ json: {} });
  });
}

const session = { access_token: "fake", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: "fake", user };
const cookie = { name: "sb-localhost-auth-token", value: "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url"), domain: "localhost", path: "/" };

const PAGES = ["/", "/calendar", "/calendar?view=week", "/add", "/add?mode=ai", "/reminders", "/proposals/demo", "/spiritual", "/fitness", "/music", "/podcast", "/habits", "/settings", "/assistant", "/travel"];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" });
  const problems: string[] = [];
  for (const [label, vp, scheme] of [["iphone", { width: 390, height: 844 }, "light"], ["iphone-dark", { width: 390, height: 844 }, "dark"], ["mac", { width: 1440, height: 900 }, "light"]] as const) {
    const ctx = await browser.newContext({ serviceWorkers: "block", viewport: vp, deviceScaleFactor: 2, colorScheme: scheme, isMobile: label !== "mac", hasTouch: label !== "mac" });
    await ctx.addCookies([cookie]);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => problems.push(`${label} ${page.url()} pageerror: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource|ServiceWorker|sw\.js/.test(m.text())) problems.push(`${label} console: ${m.text()}`); });
    await route(page);
    for (const p of label === "iphone" ? PAGES : ["/", "/calendar?view=week", "/reminders", "/proposals/demo"]) {
      await page.goto(BASE + p, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      if (p === "/" && label !== "mac") console.log(label, "nav:", await page.evaluate(() => { const n = document.querySelector('nav[aria-label="Main"]'); return n ? JSON.stringify(n.getBoundingClientRect()) : "missing"; }));
      const overflow = (await page.evaluate(() => Math.max(document.documentElement.scrollWidth, window.innerWidth))) - vp.width;
      if (overflow > 2) {
        const culprits = await page.evaluate((w) => [...document.querySelectorAll("body *")].filter((el) => el.getBoundingClientRect().right > w + 1 && !(el.parentElement && el.parentElement.getBoundingClientRect().right > w + 1)).slice(0, 4).map((el) => `${el.tagName}.${(el.className || "").toString().slice(0, 80)} "${(el.textContent || "").slice(0, 40)}"`), vp.width);
        problems.push(`${label} ${p}: horizontal overflow ${overflow}px → ${culprits.join(" | ")}`);
      }
      const name = `${label}${p.replace(/[/?=]/g, "_") || "_home"}.png`;
      await page.screenshot({ path: `${OUT}/${name}`, fullPage: false });
    }
    await ctx.close();
  }
  await browser.close();
  console.log(problems.length ? `PROBLEMS:\n${problems.join("\n")}` : "No page errors, console errors or horizontal overflow.");
  process.exit(0);
})();
