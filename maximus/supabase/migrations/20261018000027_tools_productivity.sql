-- =============================================================================
-- MAXIMUS — 0027 Tools: productivity foundation
-- Focus sessions (Pomodoro, deep work, stopwatch, countdown, focus mode),
-- timer preferences, goals with progress updates, habits, time blocks and
-- brain-game scores. All private to their owner; sharing with an
-- accountability partner is added in 0028.
--
-- Timers store timestamps, not ticks: elapsed time is computed from
-- started_at / paused_at / paused_seconds so it survives refreshes and closed tabs.
-- Time spent is never counted as goal progress; members record progress themselves.
-- =============================================================================

create table public.timer_prefs (
  user_id        uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  work_minutes   smallint not null default 25 check (work_minutes between 5 and 180),
  short_break    smallint not null default 5 check (short_break between 1 and 60),
  long_break     smallint not null default 15 check (long_break between 1 and 90),
  long_every     smallint not null default 4 check (long_every between 2 and 12),
  sound          boolean not null default true,
  vibrate        boolean not null default true,
  updated_at     timestamptz not null default now()
);

create table public.tool_goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title        text not null check (length(trim(title)) between 1 and 160),
  description  text check (length(description) <= 2000),
  category     text not null default 'business'
               check (category in ('business', 'prospecting', 'sales', 'team', 'learning', 'personal', 'health', 'finance', 'other')),
  horizon      text not null default 'daily' check (horizon in ('daily', 'weekly', 'monthly', 'quarterly', 'personal')),
  start_date   date not null default current_date,
  deadline     date,
  priority     smallint not null default 2 check (priority between 1 and 3),
  target       numeric(12, 2) check (target > 0),
  unit         text check (length(unit) <= 30),
  progress     numeric(12, 2) not null default 0 check (progress >= 0),
  status       text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  completed_at timestamptz,
  remind_at    timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (deadline is null or deadline >= start_date)
);
create index tool_goals_user_idx on public.tool_goals (user_id, status, deadline);
create trigger tool_goals_updated_at before update on public.tool_goals for each row execute function public.set_updated_at();

create table public.focus_sessions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind            text not null check (kind in ('pomodoro', 'break', 'deep_work', 'stopwatch', 'countdown', 'focus')),
  label           text check (length(label) <= 160),
  task_id         uuid references public.tasks (id) on delete set null,
  goal_id         uuid references public.tool_goals (id) on delete set null,
  planned_seconds integer check (planned_seconds between 1 and 86400),
  started_at      timestamptz not null default now(),
  paused_at       timestamptz,
  paused_seconds  integer not null default 0 check (paused_seconds >= 0),
  ended_at        timestamptz,
  status          text not null default 'running' check (status in ('running', 'paused', 'completed', 'abandoned')),
  interruptions   smallint not null default 0 check (interruptions between 0 and 500),
  notes           text check (length(notes) <= 1000),
  room_id         uuid,
  created_at      timestamptz not null default now()
);
create index focus_sessions_user_idx on public.focus_sessions (user_id, started_at desc);
create unique index focus_sessions_one_running on public.focus_sessions (user_id) where status in ('running', 'paused') and kind <> 'break';

-- Seconds actually focused (excludes pauses), from timestamps.
create or replace function public.focus_seconds(s public.focus_sessions)
returns integer language sql immutable as $$
  select greatest(0, floor(extract(epoch from (coalesce(s.ended_at, case when s.status = 'paused' then s.paused_at end, now()) - s.started_at)))::int - s.paused_seconds)
$$;

create table public.goal_updates (
  id               uuid primary key default gen_random_uuid(),
  goal_id          uuid not null references public.tool_goals (id) on delete cascade,
  user_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  new_progress     numeric(12, 2) not null check (new_progress >= 0),
  note             text check (length(note) <= 500),
  focus_session_id uuid references public.focus_sessions (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index goal_updates_goal_idx on public.goal_updates (goal_id, created_at desc);

create table public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 80),
  icon          text check (length(icon) <= 8),
  days          smallint[] not null default '{1,2,3,4,5,6,7}',   -- ISO weekdays it's due
  reminder_time time,
  archived      boolean not null default false,
  created_at    timestamptz not null default now()
);
create index habits_user_idx on public.habits (user_id) where not archived;

create table public.habit_checks (
  habit_id   uuid not null references public.habits (id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  check_date date not null,
  created_at timestamptz not null default now(),
  primary key (habit_id, check_date)
);
create index habit_checks_user_idx on public.habit_checks (user_id, check_date desc);

create table public.time_blocks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  block_date date not null,
  start_min  smallint not null check (start_min between 0 and 1439),
  end_min    smallint not null check (end_min between 1 and 1440),
  title      text not null check (length(trim(title)) between 1 and 120),
  category   text not null default 'work' check (category in ('work', 'prospecting', 'follow_up', 'learning', 'meeting', 'personal', 'break')),
  task_id    uuid references public.tasks (id) on delete set null,
  done       boolean not null default false,
  created_at timestamptz not null default now(),
  check (end_min > start_min)
);
create index time_blocks_user_date_idx on public.time_blocks (user_id, block_date);

create table public.game_scores (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  game        text not null check (game ~ '^[a-z0-9_]{2,32}$'),
  level       text check (length(level) <= 20),
  score       integer not null check (score between 0 and 100000000),
  duration_ms integer check (duration_ms between 0 and 86400000),
  won         boolean,
  created_at  timestamptz not null default now()
);
create index game_scores_user_game_idx on public.game_scores (user_id, game, score desc);
create index game_scores_game_idx on public.game_scores (game, created_at desc);

-- Row Level Security: everything here is the owner's own.
do $do$
declare t text;
begin
  foreach t in array array['timer_prefs', 'tool_goals', 'focus_sessions', 'goal_updates', 'habits', 'habit_checks', 'time_blocks', 'game_scores']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())', t || '_own', t);
  end loop;
end
$do$;
-- Scores can't be edited after the fact.
revoke update on public.game_scores from authenticated;

-- Goal progress goes through this so every change is logged and completion is stamped.
create or replace function public.record_goal_progress(p_goal uuid, p_progress numeric, p_note text default null, p_session uuid default null)
returns void language plpgsql security definer set search_path = public as $$
declare g tool_goals%rowtype;
begin
  select * into g from tool_goals where id = p_goal and user_id = auth.uid() for update;
  if not found then raise exception 'Goal not found'; end if;
  if p_progress is null or p_progress < 0 then raise exception 'Progress must be zero or more'; end if;
  if p_session is not null and not exists (select 1 from focus_sessions where id = p_session and user_id = auth.uid()) then
    raise exception 'Focus session not found';
  end if;
  insert into goal_updates (goal_id, user_id, new_progress, note, focus_session_id) values (p_goal, auth.uid(), p_progress, left(p_note, 500), p_session);
  update tool_goals set progress = p_progress,
    status = case when target is not null and p_progress >= target then 'completed' when status = 'completed' then 'active' else status end,
    completed_at = case when target is not null and p_progress >= target then coalesce(completed_at, now()) else null end
  where id = p_goal;
end $$;

-- Productivity score (0–100) for the last 7 days. Transparent and verifiable:
-- 40% tasks completed vs due, 30% goal progress, 30% habit consistency.
-- Focus minutes are shown separately and do not add points on their own.
create or replace function public.productivity_score(p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user uuid := coalesce(p_user, auth.uid());
  v_from date := current_date - 6;
  v_tasks_due int; v_tasks_done int; v_goal_pct numeric; v_habit_due int; v_habit_done int; v_focus int;
  t numeric; g numeric; h numeric;
begin
  if v_user <> auth.uid() then raise exception 'Not allowed' using errcode = '42501'; end if;
  select count(*) filter (where due_date between v_from and current_date or completed_at::date between v_from and current_date),
         count(*) filter (where completed_at::date between v_from and current_date)
    into v_tasks_due, v_tasks_done from tasks where user_id = v_user;
  select avg(least(1, progress / target)) into v_goal_pct from tool_goals
    where user_id = v_user and target is not null and status <> 'abandoned'
      and (deadline is null or deadline >= v_from) and start_date <= current_date;
  select count(*) into v_habit_due from habits h2 cross join generate_series(v_from, current_date, interval '1 day') d
    where h2.user_id = v_user and not h2.archived and extract(isodow from d)::smallint = any (h2.days) and d::date >= h2.created_at::date;
  select count(*) into v_habit_done from habit_checks where user_id = v_user and check_date between v_from and current_date;
  select coalesce(sum(focus_seconds(s)), 0) / 60 into v_focus from focus_sessions s
    where user_id = v_user and kind <> 'break' and status = 'completed' and started_at >= v_from;
  t := case when v_tasks_due > 0 then least(1, v_tasks_done::numeric / v_tasks_due) end;
  g := v_goal_pct;
  h := case when v_habit_due > 0 then least(1, v_habit_done::numeric / v_habit_due) end;
  return jsonb_build_object(
    'score', round(100 * (coalesce(t, 0) * 0.4 + coalesce(g, 0) * 0.3 + coalesce(h, 0) * 0.3)
                   / nullif((case when t is null then 0 else 0.4 end) + (case when g is null then 0 else 0.3 end) + (case when h is null then 0 else 0.3 end), 0)),
    'tasks_due', v_tasks_due, 'tasks_done', v_tasks_done,
    'goal_progress_pct', round(coalesce(g, 0) * 100), 'habit_due', v_habit_due, 'habit_done', v_habit_done,
    'focus_minutes', v_focus);
end $$;

revoke execute on function public.record_goal_progress(uuid, numeric, text, uuid) from public, anon;
grant execute on function public.record_goal_progress(uuid, numeric, text, uuid) to authenticated;
revoke execute on function public.productivity_score(uuid) from public, anon;
grant execute on function public.productivity_score(uuid) to authenticated;
