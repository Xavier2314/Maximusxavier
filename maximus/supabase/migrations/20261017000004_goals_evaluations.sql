-- =============================================================================
-- MAXIMUS — 0004 Monthly Goals & Five-Day Evaluations
-- =============================================================================

create type public.goal_status as enum ('draft', 'submitted', 'approved', 'revision_requested');

create table public.monthly_goals (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  month                       date not null check (extract(day from month) = 1),
  income_target               numeric(14, 2) check (income_target >= 0),
  sales_target                numeric(14, 2) check (sales_target >= 0),
  prospecting_target          integer check (prospecting_target >= 0),
  recruitment_target          integer check (recruitment_target >= 0),
  order_target                integer check (order_target >= 0),
  savings_target              numeric(14, 2) check (savings_target >= 0),
  personal_development_target text check (length(personal_development_target) <= 1000),
  -- [{ "title": "Read 2 books", "target": 2, "unit": "books", "progress": 0 }]
  custom_goals                jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_goals) = 'array'),
  status                      public.goal_status not null default 'draft',
  reviewer_id                 uuid references public.profiles (id) on delete set null,
  submitted_at                timestamptz,
  reviewed_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (user_id, month)
);
create index monthly_goals_month_idx on public.monthly_goals (month, status);
create trigger monthly_goals_updated_at before update on public.monthly_goals
  for each row execute function public.set_updated_at();

create type public.goal_feedback_action as enum ('comment', 'approve', 'request_revision');

create table public.goal_feedback (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.monthly_goals (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  action       public.goal_feedback_action not null default 'comment',
  comment      text check (length(comment) <= 2000),
  action_steps text check (length(action_steps) <= 2000),
  created_at   timestamptz not null default now()
);
create index goal_feedback_goal_idx on public.goal_feedback (goal_id, created_at);

-- Owners may edit only drafts or goals sent back for revision, and may only
-- move them to 'draft' or 'submitted'. Approvals go through review_goal().
create or replace function public.monthly_goals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_reviewer uuid;
begin
  if current_setting('maximus.goal_review', true) = 'on' then
    return new;  -- change made by review_goal()
  end if;
  if tg_op = 'UPDATE' and old.status not in ('draft', 'revision_requested') then
    raise exception 'This goal has been % and can no longer be edited', old.status;
  end if;
  if new.status not in ('draft', 'submitted') then
    raise exception 'Invalid status change';
  end if;
  new.reviewer_id := null;
  new.reviewed_at := null;
  if new.status = 'submitted' then
    new.submitted_at := now();
    select sponsor_id into v_reviewer from profiles where id = new.user_id;
    new.reviewer_id := v_reviewer;
  end if;
  return new;
end $$;
create trigger monthly_goals_guard before insert or update on public.monthly_goals
  for each row execute function public.monthly_goals_guard();

create or replace function public.monthly_goals_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') and new.reviewer_id is not null then
    select full_name into v_name from profiles where id = new.user_id;
    perform notify(new.reviewer_id, 'goal_submitted', 'New monthly goals to review',
                   v_name || ' submitted goals for ' || to_char(new.month, 'FMMonth YYYY') || '.',
                   '/goals/' || new.id, jsonb_build_object('goal_id', new.id));
  end if;
  return new;
end $$;
create trigger monthly_goals_notify after insert or update of status on public.monthly_goals
  for each row execute function public.monthly_goals_notify();

create or replace function public.review_goal(
  p_goal uuid, p_action public.goal_feedback_action, p_comment text default null, p_steps text default null
) returns public.goal_feedback
language plpgsql security definer set search_path = public as $$
declare v_goal monthly_goals; v_fb goal_feedback;
begin
  select * into v_goal from monthly_goals where id = p_goal for update;
  if not found then raise exception 'Goal not found'; end if;
  if v_goal.user_id = auth.uid() then raise exception 'You cannot review your own goals'; end if;
  if not (has_permission('review_member_goals') and can_view_team_data(v_goal.user_id)) then
    raise exception 'You are not authorised to review this member''s goals' using errcode = '42501';
  end if;
  if p_action <> 'comment' and v_goal.status <> 'submitted' then
    raise exception 'Only submitted goals can be approved or sent back';
  end if;
  if p_action = 'comment' and nullif(trim(coalesce(p_comment, '') || coalesce(p_steps, '')), '') is null then
    raise exception 'Please write a comment or action steps';
  end if;

  insert into goal_feedback (goal_id, author_id, action, comment, action_steps)
  values (p_goal, auth.uid(), p_action, nullif(trim(p_comment), ''), nullif(trim(p_steps), ''))
  returning * into v_fb;

  if p_action <> 'comment' then
    perform set_config('maximus.goal_review', 'on', true);
    update monthly_goals set
      status = case p_action when 'approve' then 'approved'::goal_status else 'revision_requested'::goal_status end,
      reviewer_id = auth.uid(), reviewed_at = now()
    where id = p_goal;
    perform set_config('maximus.goal_review', 'off', true);
  end if;

  perform notify(v_goal.user_id, 'sponsor_feedback',
    case p_action when 'approve' then 'Your goals were approved 🎉'
                  when 'request_revision' then 'Your sponsor requested goal revisions'
                  else 'New feedback on your goals' end,
    coalesce(left(p_comment, 140), left(p_steps, 140)),
    '/goals/' || p_goal, jsonb_build_object('goal_id', p_goal));
  return v_fb;
end $$;

-- -----------------------------------------------------------------------------
-- Five-day evaluations: 1st, 5th, 10th, 15th, 20th, 25th, 30th.
-- In shorter months the 30th becomes the last day of the month.
-- -----------------------------------------------------------------------------
create or replace function public.evaluation_dates(p_month date)
returns setof date language sql immutable as $$
  select distinct least(date_trunc('month', p_month)::date + (d - 1),
                        (date_trunc('month', p_month) + interval '1 month - 1 day')::date)
  from unnest(array[1, 5, 10, 15, 20, 25, 30]) as d
  order by 1
$$;

create or replace function public.current_evaluation_period(p_day date default current_date)
returns date language sql immutable as $$
  select max(d) from public.evaluation_dates(p_day) d where d <= p_day
$$;

create or replace function public.next_evaluation_date(p_day date default current_date)
returns date language sql immutable as $$
  select coalesce(
    (select min(d) from public.evaluation_dates(p_day) d where d > p_day),
    (date_trunc('month', p_day) + interval '1 month')::date)
$$;

create table public.evaluations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  period_date       date not null,
  earnings          numeric(14, 2) not null default 0 check (earnings >= 0),
  prospects         integer not null default 0 check (prospects >= 0),
  presentations     integer not null default 0 check (presentations >= 0),
  follow_ups        integer not null default 0 check (follow_ups >= 0),
  orders_generated  integer not null default 0 check (orders_generated >= 0),
  new_joins         integer not null default 0 check (new_joins >= 0),
  members_supported integer not null default 0 check (members_supported >= 0),
  challenges        text check (length(challenges) <= 2000),
  priorities        text check (length(priorities) <= 2000),
  support_needed    text check (length(support_needed) <= 2000),
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, period_date)
);
create index evaluations_period_idx on public.evaluations (period_date);
create trigger evaluations_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();

create or replace function public.evaluations_guard() returns trigger
language plpgsql as $$
begin
  if new.period_date not in (select public.evaluation_dates(new.period_date)) then
    raise exception 'Evaluations are due on the 1st, 5th, 10th, 15th, 20th, 25th and 30th (or month end)';
  end if;
  if new.period_date > current_date then
    raise exception 'You cannot submit an evaluation for a future date';
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.period_date <> old.period_date then
      raise exception 'Evaluation owner and period cannot be changed';
    end if;
    -- Editable only until the next evaluation date.
    if current_date >= public.next_evaluation_date(old.period_date) then
      raise exception 'This evaluation period has closed';
    end if;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;
create trigger evaluations_guard before insert or update on public.evaluations
  for each row execute function public.evaluations_guard();

create or replace function public.evaluations_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sponsor uuid; v_name text;
begin
  select sponsor_id, full_name into v_sponsor, v_name from profiles where id = new.user_id;
  perform notify(v_sponsor, 'evaluation_completed', 'Evaluation completed',
                 v_name || ' completed the ' || to_char(new.period_date, 'FMDDth Mon') || ' evaluation.',
                 '/evaluations/' || new.id, jsonb_build_object('evaluation_id', new.id));
  return new;
end $$;
create trigger evaluations_notify after insert on public.evaluations
  for each row execute function public.evaluations_notify();

create table public.evaluation_feedback (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  comment       text not null check (length(trim(comment)) between 1 and 2000),
  created_at    timestamptz not null default now()
);
create index evaluation_feedback_eval_idx on public.evaluation_feedback (evaluation_id, created_at);

create or replace function public.evaluation_feedback_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from evaluations where id = new.evaluation_id;
  perform notify(v_owner, 'sponsor_feedback', 'New feedback on your evaluation',
                 left(new.comment, 140), '/evaluations/' || new.evaluation_id,
                 jsonb_build_object('evaluation_id', new.evaluation_id));
  return new;
end $$;
create trigger evaluation_feedback_notify after insert on public.evaluation_feedback
  for each row execute function public.evaluation_feedback_notify();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.monthly_goals enable row level security;
alter table public.goal_feedback enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_feedback enable row level security;

create policy monthly_goals_read on public.monthly_goals for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy monthly_goals_insert on public.monthly_goals for insert to authenticated
  with check (user_id = auth.uid());
create policy monthly_goals_update on public.monthly_goals for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy monthly_goals_delete on public.monthly_goals for delete to authenticated
  using (user_id = auth.uid() and status = 'draft');

create policy goal_feedback_read on public.goal_feedback for select to authenticated
  using (exists (select 1 from public.monthly_goals g where g.id = goal_id
                 and (g.user_id = auth.uid() or public.can_view_team_data(g.user_id))));
revoke insert, update, delete on public.goal_feedback from authenticated, anon;

create policy evaluations_read on public.evaluations for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy evaluations_insert on public.evaluations for insert to authenticated
  with check (user_id = auth.uid());
create policy evaluations_update on public.evaluations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy evaluation_feedback_read on public.evaluation_feedback for select to authenticated
  using (exists (select 1 from public.evaluations e where e.id = evaluation_id
                 and (e.user_id = auth.uid() or public.can_view_team_data(e.user_id))));
create policy evaluation_feedback_insert on public.evaluation_feedback for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.has_permission('review_member_goals')
    and exists (select 1 from public.evaluations e where e.id = evaluation_id
                and e.user_id <> auth.uid() and public.can_view_team_data(e.user_id)));
