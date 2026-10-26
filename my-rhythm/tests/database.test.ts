import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { CATEGORY_SEED, buildSeedActivities } from "@/lib/seed/routine";

/**
 * Applies the real migration to an in-process PostgreSQL (PGlite) with a
 * minimal stand-in for Supabase's auth schema and roles, then verifies Row
 * Level Security, constraints and the scheduler's claim function.
 */
const SUPABASE_STUB = `
  create schema if not exists auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}'::jsonb);
  create or replace function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
    if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
  end $$;
  grant usage on schema public, auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
`;

let db: PGlite;
const A = randomUUID();
const B = randomUUID();

async function as<T>(uid: string | null, role: "authenticated" | "anon" | "service_role", fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try {
    return await fn();
  } finally {
    await db.exec(`reset role;`);
  }
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  await db.exec(SUPABASE_STUB);
  const dir = path.resolve(import.meta.dirname, "../supabase/migrations");
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, f), "utf8"));
  }
  await db.exec(`insert into auth.users(id, email) values ('${A}', 'owner@example.com'), ('${B}', 'intruder@example.com');`);
}, 60_000);

describe("database schema & security", () => {
  it("creates profile + preferences for new users via trigger", async () => {
    const r = await db.query<{ n: number }>(`select count(*)::int as n from public.profiles`);
    expect(r.rows[0].n).toBe(2);
    const p = await db.query<{ timezone: string; wake_time: string; bedtime: string }>(`select timezone, wake_time::text, bedtime::text from public.profiles where id = $1`, [A]);
    expect(p.rows[0]).toEqual({ timezone: "Africa/Lagos", wake_time: "05:00:00", bedtime: "21:00:00" });
  });

  it("seeds the full routine for the owner", async () => {
    await as(A, "authenticated", async () => {
      for (const c of CATEGORY_SEED) {
        await db.query(`insert into public.activity_categories(key, name, color, icon, priority_rank, notify, default_reminders) values ($1,$2,$3,$4,$5,$6,$7)`,
          [c.key, c.name, c.color, c.icon, c.priority_rank, c.notify, JSON.stringify(c.default_reminders)]);
      }
      const cats = await db.query<{ id: string; key: string }>(`select id, key from public.activity_categories`);
      const built = buildSeedActivities("2026-10-14", Object.fromEntries(cats.rows.map((c) => [c.key, c.id])), {}, randomUUID);
      for (const { activity: a, rules } of built) {
        await db.query(
          `insert into public.activities(id, title, description, category_id, kind, classification, priority, start_date, start_time, duration_minutes, recurrence, checklist, group_key, source, dedupe_key)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
          [a.id, a.title, a.description, a.category_id, a.kind, a.classification, a.priority, a.start_date, a.start_time, a.duration_minutes, JSON.stringify(a.recurrence), JSON.stringify(a.checklist), a.group_key, a.source, a.dedupe_key],
        );
        for (const r of rules) await db.query(`insert into public.reminder_rules(activity_id, anchor, offset_minutes, message) values ($1,$2,$3,$4)`, [a.id, r.anchor, r.offset_minutes, r.message ?? null]);
      }
      const n = await db.query<{ n: number }>(`select count(*)::int as n from public.activities`);
      expect(n.rows[0].n).toBe(17);
      const office = await db.query<{ start_date: string }>(`select start_date::text from public.activities where dedupe_key = 'seed:office'`);
      expect(office.rows[0].start_date).toBe("2026-10-19");
    });
  });

  it("Row Level Security: another signed-in user cannot read or modify the owner's data", async () => {
    await as(B, "authenticated", async () => {
      expect((await db.query(`select * from public.activities`)).rows).toHaveLength(0);
      expect((await db.query(`select * from public.profiles`)).rows).toHaveLength(1); // only their own
      const upd = await db.query(`update public.activities set title = 'hacked'`);
      expect(upd.affectedRows ?? 0).toBe(0);
      const del = await db.query(`delete from public.reminder_rules`);
      expect(del.affectedRows ?? 0).toBe(0);
      // cannot insert rows claiming to belong to the owner
      await expect(db.query(`insert into public.prayer_journal(user_id, entry_date, title) values ($1, '2026-10-14', 'x')`, [A])).rejects.toThrow();
    });
    await as(A, "authenticated", async () => {
      const t = await db.query<{ n: number }>(`select count(*)::int as n from public.activities where title = 'hacked'`);
      expect(t.rows[0].n).toBe(0);
    });
  });

  it("anonymous visitors see nothing", async () => {
    await as(null, "anon", async () => {
      await expect(db.query(`select * from public.activities`)).rejects.toThrow();
    });
  });

  it("prevents duplicate activities and duplicate reminders", async () => {
    await as(A, "authenticated", async () => {
      await expect(
        db.query(`insert into public.activities(title, start_date, start_time, dedupe_key) values ('Bible study & prayer', '2026-10-14', '05:00', 'seed:devotion')`),
      ).rejects.toThrow(/duplicate key/);
      await db.query(`insert into public.scheduled_reminders(kind, fire_at, title, body, dedupe_key) values ('test', now(), 't', 'b', 'k1')`);
      await expect(db.query(`insert into public.scheduled_reminders(kind, fire_at, title, body, dedupe_key) values ('test', now(), 't', 'b', 'k1')`)).rejects.toThrow(/duplicate key/);
      // the planner's upsert path is a no-op on conflict
      await db.query(`insert into public.scheduled_reminders(kind, fire_at, title, body, dedupe_key) values ('test', now(), 't', 'b', 'k1') on conflict (user_id, dedupe_key) do nothing`);
      const n = await db.query<{ n: number }>(`select count(*)::int as n from public.scheduled_reminders where dedupe_key = 'k1'`);
      expect(n.rows[0].n).toBe(1);
    });
  });

  it("claim_due_reminders claims each due reminder exactly once and expires stale ones", async () => {
    await db.query(`delete from public.scheduled_reminders`);
    await db.query(`insert into public.scheduled_reminders(user_id, kind, fire_at, title, body, dedupe_key) values
      ($1, 'activity', now() - interval '1 minute', 'due', 'b', 'due1'),
      ($1, 'activity', now() + interval '1 hour', 'future', 'b', 'fut1'),
      ($1, 'activity', now() - interval '2 hours', 'stale', 'b', 'old1')`, [A]);
    const first = await as(null, "service_role", () => db.query<{ title: string }>(`select title from public.claim_due_reminders(100, 30)`));
    expect(first.rows.map((r) => r.title)).toEqual(["due"]);
    const second = await as(null, "service_role", () => db.query(`select * from public.claim_due_reminders(100, 30)`));
    expect(second.rows).toHaveLength(0);
    const st = await db.query<{ title: string; status: string }>(`select title, status from public.scheduled_reminders order by title`);
    expect(Object.fromEntries(st.rows.map((r) => [r.title, r.status]))).toEqual({ due: "sending", future: "pending", stale: "expired" });
  });

  it("signed-in users cannot call the scheduler's claim function", async () => {
    await as(A, "authenticated", async () => {
      await expect(db.query(`select * from public.claim_due_reminders(100, 30)`)).rejects.toThrow(/permission denied/);
    });
  });

  it("data persists and is scoped after 'logging out and back in'", async () => {
    await as(A, "authenticated", async () => {
      await db.query(`insert into public.reflections(entry_date, kind, body) values ('2026-10-14', 'reflection', 'Grateful today')`);
    });
    await as(A, "authenticated", async () => {
      const r = await db.query<{ body: string }>(`select body from public.reflections`);
      expect(r.rows.map((x) => x.body)).toEqual(["Grateful today"]);
    });
  });

  it("recurring edits: exceptions are unique per occurrence and a moved occurrence needs valid times", async () => {
    await as(A, "authenticated", async () => {
      const a = await db.query<{ id: string }>(`select id from public.activities where dedupe_key = 'seed:gym-workout'`);
      const id = a.rows[0].id;
      await db.query(`insert into public.activity_exceptions(activity_id, occurrence_date, kind) values ($1, '2026-10-19', 'cancelled')`, [id]);
      await expect(db.query(`insert into public.activity_exceptions(activity_id, occurrence_date, kind) values ($1, '2026-10-19', 'cancelled')`, [id])).rejects.toThrow();
      await expect(db.query(`insert into public.activity_exceptions(activity_id, occurrence_date, kind) values ($1, '2026-10-21', 'modified')`, [id])).rejects.toThrow();
    });
  });
});
