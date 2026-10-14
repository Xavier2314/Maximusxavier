-- ════════════════════════════════════════════════════════════════════
-- MY RHYTHM — initial schema
-- Every user-owned table carries user_id and is protected by Row Level
-- Security so that a signed-in user can only ever see their own rows.
-- The service role (used only by the server-side scheduler) bypasses RLS.
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Helpers ─────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ─── Profiles & preferences ─────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Friend',
  timezone text not null default 'Africa/Lagos',
  wake_time time not null default '05:00',
  bedtime time not null default '21:00',
  seeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'system' check (theme in ('system','light','dark')),
  notifications_enabled boolean not null default true,
  bedtime_reminders_enabled boolean not null default true,
  wind_down_minutes int not null default 30 check (wind_down_minutes between 0 and 180),
  daily_agenda_enabled boolean not null default true,
  daily_agenda_time time not null default '04:45',
  weekly_review_enabled boolean not null default true,
  in_app_sound_enabled boolean not null default true,
  in_app_sound text not null default 'chime',
  ai_enabled boolean not null default true,
  max_daily_hours numeric(4,1) not null default 11.0,
  min_buffer_minutes int not null default 15,
  focus_hours jsonb not null default '[{"days":[1,2,3,4,5,6],"start":"09:00","end":"12:00"}]'::jsonb,
  protected_rest jsonb not null default '[{"days":[7],"start":"06:00","end":"16:00","label":"Church, family & rest"}]'::jsonb,
  priorities jsonb not null default '[
    "Morning Bible devotion and spiritual growth",
    "Adequate sleep, health, and recovery",
    "Fixed office and keyboard commitments",
    "Gym, keyboard practice, and personal development",
    "Podcast production and flexible projects"]'::jsonb,
  last_scheduler_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─── Categories ─────────────────────────────────────────────────────
create table public.activity_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key text not null,
  name text not null,
  color text not null,
  icon text not null default 'circle',
  priority_rank int not null default 3 check (priority_rank between 1 and 9),
  notify boolean not null default true,
  default_reminders jsonb not null default '[{"anchor":"start","offset_minutes":-10},{"anchor":"start","offset_minutes":0}]'::jsonb,
  created_at timestamptz not null default now(),
  unique (user_id, key)
);

-- ─── Activities (one-time + recurring) ──────────────────────────────
-- recurrence (the recurrence rule) is stored as validated JSON:
--   {"freq":"daily|weekly|monthly|yearly","interval":1,"by_weekday":[1..7],
--    "until":"YYYY-MM-DD","count":N}
-- Weekdays follow ISO numbering (1 = Monday … 7 = Sunday).
-- timezone NULL means "floating": the occurrence follows the profile timezone
-- (so your routine moves with you when you travel).
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  notes text,
  category_id uuid references public.activity_categories(id) on delete set null,
  location text,
  kind text not null default 'event' check (kind in
    ('event','appointment','meeting','trip','conference','church','family','project','habit','task','block','routine')),
  classification text not null default 'flexible' check (classification in ('fixed','flexible','essential','optional')),
  priority int not null default 3 check (priority between 1 and 5),
  start_date date not null,
  start_time time,
  duration_minutes int not null default 60 check (duration_minutes between 0 and 60*24*31),
  all_day boolean not null default false,
  end_date date,
  timezone text,
  recurrence jsonb,
  prep_minutes int not null default 0 check (prep_minutes >= 0),
  travel_minutes int not null default 0 check (travel_minutes >= 0),
  recovery_minutes int not null default 0 check (recovery_minutes >= 0),
  checklist jsonb not null default '[]'::jsonb,
  group_key text,
  status text not null default 'active' check (status in ('active','cancelled','archived')),
  source text not null default 'manual' check (source in ('seed','manual','ai','voice','travel','import')),
  trip_id uuid,
  series_parent_id uuid references public.activities(id) on delete set null,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (all_day or start_time is not null),
  check (end_date is null or end_date >= start_date)
);
create unique index activities_dedupe_active on public.activities(user_id, dedupe_key) where status = 'active';
create index activities_user_status on public.activities(user_id, status);

create table public.activity_exceptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  occurrence_date date not null,
  kind text not null check (kind in ('cancelled','modified','needs_reschedule')),
  start_at timestamptz,
  end_at timestamptz,
  title text,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, occurrence_date),
  check (kind <> 'modified' or (start_at is not null and end_at is not null and end_at > start_at))
);

create table public.activity_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  occurrence_date date not null,
  status text not null check (status in ('in_progress','completed','skipped')),
  started_at timestamptz,
  completed_at timestamptz,
  duration_minutes int,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_id, occurrence_date)
);

-- ─── Reminders ──────────────────────────────────────────────────────
create table public.reminder_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id uuid not null references public.activities(id) on delete cascade,
  anchor text not null default 'start' check (anchor in ('start','end')),
  offset_minutes int not null check (offset_minutes between -10080 and 1440),
  message text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (activity_id, anchor, offset_minutes)
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  device_label text,
  platform text,
  active boolean not null default true,
  failure_count int not null default 0,
  last_success_at timestamptz,
  last_failure_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  activity_id uuid references public.activities(id) on delete cascade,
  occurrence_date date,
  rule_id uuid references public.reminder_rules(id) on delete set null,
  kind text not null check (kind in ('activity','snooze','winddown','bedtime','agenda','test','custom')),
  fire_at timestamptz not null,
  title text not null,
  body text not null,
  url text not null default '/',
  status text not null default 'pending'
    check (status in ('pending','sending','sent','failed','cancelled','suppressed','expired')),
  attempts int not null default 0,
  sent_at timestamptz,
  last_error text,
  dedupe_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, dedupe_key)
);
create index scheduled_reminders_due on public.scheduled_reminders(status, fire_at);
create index scheduled_reminders_user_fire on public.scheduled_reminders(user_id, fire_at);

create table public.notification_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reminder_id uuid references public.scheduled_reminders(id) on delete set null,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  -- accepted  = push service (Apple/Google/Mozilla) accepted the message
  -- received  = the service worker on the device reported it displayed it
  -- clicked / action = user interacted with the notification
  event text not null check (event in ('accepted','failed','expired','received','clicked','action')),
  http_status int,
  detail text,
  created_at timestamptz not null default now()
);
create index delivery_logs_user_time on public.notification_delivery_logs(user_id, created_at desc);

-- ─── Spiritual growth ───────────────────────────────────────────────
create table public.bible_reading_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  start_date date not null,
  days int not null check (days between 1 and 3660),
  books text[] not null,
  schedule jsonb not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.bible_reading_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  plan_id uuid references public.bible_reading_plans(id) on delete cascade,
  book text not null,
  chapter int not null check (chapter > 0),
  read_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, plan_id, book, chapter)
);

create table public.prayer_journal (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  title text not null,
  body text,
  answered boolean not null default false,
  answered_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  kind text not null check (kind in ('reflection','gratitude','sermon')),
  title text,
  body text not null,
  scripture_refs text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.saved_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reference text not null,
  verse_text text,
  translation text,
  note text,
  created_at timestamptz not null default now()
);

-- ─── Fitness ────────────────────────────────────────────────────────
create table public.gym_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text,
  equipment text,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.gym_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_date date not null,
  activity_id uuid references public.activities(id) on delete set null,
  workout_type text not null default 'Strength',
  duration_minutes int check (duration_minutes >= 0),
  energy int check (energy between 1 and 5),
  notes text,
  recovery_notes text,
  created_at timestamptz not null default now()
);

create table public.gym_workout_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  workout_id uuid not null references public.gym_workouts(id) on delete cascade,
  exercise_name text not null,
  set_number int not null default 1,
  reps int,
  weight_kg numeric(6,2),
  duration_seconds int,
  rest_seconds int,
  created_at timestamptz not null default now()
);

-- ─── Keyboard / music ───────────────────────────────────────────────
create table public.keyboard_lessons (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_date date not null,
  activity_id uuid references public.activities(id) on delete set null,
  attended boolean not null default true,
  topics text,
  teacher_feedback text,
  improvement_areas text,
  notes text,
  created_at timestamptz not null default now()
);

create table public.keyboard_practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  practice_date date not null,
  started_at timestamptz,
  duration_minutes int not null check (duration_minutes > 0),
  focus text,
  notes text,
  activity_id uuid references public.activities(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.music_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('chord_progression','scale','song','exercise','skill','milestone')),
  name text not null,
  details text,
  status text not null default 'learning' check (status in ('learning','practicing','mastered')),
  achieved_on date,
  created_at timestamptz not null default now()
);

create table public.practice_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id uuid references public.keyboard_lessons(id) on delete set null,
  title text not null,
  due_date date,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ─── Podcast ────────────────────────────────────────────────────────
create table public.podcast_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  position int not null,
  unique (user_id, name)
);

create table public.podcast_episodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null,
  stage text not null default 'Idea',
  idea text,
  research_notes text,
  outline text,
  script text,
  recording_checklist jsonb not null default '[]'::jsonb,
  editing_checklist jsonb not null default '[]'::jsonb,
  deadline date,
  publish_date date,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.podcast_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  episode_id uuid not null references public.podcast_episodes(id) on delete cascade,
  title text not null,
  due_date date,
  done boolean not null default false,
  activity_id uuid references public.activities(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Habits ─────────────────────────────────────────────────────────
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  icon text not null default 'sparkles',
  color text not null default '#8b7fd6',
  target_per_week int not null default 7 check (target_per_week between 1 and 7),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Completing an occurrence of a linked activity records the habit for that
-- day. This only ever happens from an explicit user action ("Complete").
alter table public.activities add column habit_id uuid references public.habits(id) on delete set null;

create table public.habit_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  completed_on date not null,
  minutes int,
  note text,
  created_at timestamptz not null default now(),
  unique (habit_id, completed_on)
);

-- ─── Travel ─────────────────────────────────────────────────────────
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  destination text not null,
  depart_at timestamptz not null,
  return_at timestamptz not null,
  travel_method text,
  travel_duration_minutes int,
  prep_minutes int not null default 60,
  accommodation_notes text,
  itinerary text,
  status text not null default 'planned' check (status in ('draft','planned','completed','cancelled')),
  activity_id uuid references public.activities(id) on delete set null,
  proposal_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (return_at > depart_at)
);
alter table public.activities
  add constraint activities_trip_fk foreign key (trip_id) references public.trips(id) on delete set null;

-- ─── AI ─────────────────────────────────────────────────────────────
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default 'Conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null,
  proposal_id uuid,
  created_at timestamptz not null default now()
);

create table public.schedule_proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null check (source in ('quick_add','ai_chat','voice','travel','find_time','manual_check')),
  title text not null,
  summary text,
  ai_explanation text,
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','partially_approved','rejected','expired')),
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.trips
  add constraint trips_proposal_fk foreign key (proposal_id) references public.schedule_proposals(id) on delete set null;
alter table public.ai_messages
  add constraint ai_messages_proposal_fk foreign key (proposal_id) references public.schedule_proposals(id) on delete set null;

create table public.schedule_change_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  batch_id uuid not null,
  proposal_id uuid references public.schedule_proposals(id) on delete set null,
  entity text not null check (entity in ('activities','activity_exceptions','reminder_rules','trips')),
  entity_id uuid not null,
  action text not null check (action in ('insert','update','delete')),
  before jsonb,
  after jsonb,
  description text not null,
  undone_at timestamptz,
  created_at timestamptz not null default now()
);
create index change_history_user_time on public.schedule_change_history(user_id, created_at desc);

-- ─── updated_at triggers ────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles','user_preferences','activities','activity_exceptions','activity_completions',
    'push_subscriptions','scheduled_reminders','prayer_journal','reflections','podcast_episodes','trips','ai_conversations']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ─── Row Level Security ─────────────────────────────────────────────
alter table public.profiles enable row level security;
create policy profiles_owner on public.profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

alter table public.user_preferences enable row level security;
create policy prefs_owner on public.user_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['activity_categories','activities','activity_exceptions','activity_completions',
    'reminder_rules','push_subscriptions','scheduled_reminders','notification_delivery_logs',
    'bible_reading_plans','bible_reading_progress','prayer_journal','reflections','saved_verses',
    'gym_exercises','gym_workouts','gym_workout_sets','keyboard_lessons','keyboard_practice_sessions',
    'music_items','practice_tasks','podcast_stages','podcast_episodes','podcast_tasks','habits',
    'habit_completions','trips','ai_conversations','ai_messages','schedule_proposals','schedule_change_history']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t || '_owner', t);
  end loop;
end $$;

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;

-- ─── New user bootstrap: profile + preferences ──────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, display_name)
    values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
    on conflict (id) do nothing;
  insert into public.user_preferences(user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Scheduler: atomically claim due reminders ──────────────────────
-- Uses FOR UPDATE SKIP LOCKED so overlapping cron invocations can never
-- claim (and therefore send) the same reminder twice.
-- Reminders more than p_late_minutes overdue are expired instead of being
-- delivered late (e.g. after an outage), so you never get a burst of stale alerts.
create or replace function public.claim_due_reminders(p_limit int default 100, p_late_minutes int default 30)
returns setof public.scheduled_reminders
language plpgsql security definer set search_path = public as $$
begin
  -- recover rows stuck in "sending" (crashed invocation) for a retry
  update public.scheduled_reminders
     set status = 'pending'
   where status = 'sending' and updated_at < now() - interval '5 minutes' and attempts < 3;

  update public.scheduled_reminders
     set status = 'expired', last_error = 'Delivery window passed before the scheduler ran'
   where status = 'pending' and fire_at < now() - make_interval(mins => p_late_minutes);

  return query
  update public.scheduled_reminders r
     set status = 'sending', attempts = r.attempts + 1
   where r.id in (
     select id from public.scheduled_reminders
      where status = 'pending' and fire_at <= now()
      order by fire_at
      limit p_limit
      for update skip locked)
  returning r.*;
end $$;

revoke all on function public.claim_due_reminders(int, int) from public, anon, authenticated;
