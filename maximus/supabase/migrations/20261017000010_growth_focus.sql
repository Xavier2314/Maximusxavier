-- =============================================================================
-- Growth focus: duplication tracking and "what to work on next" for every member
-- =============================================================================

-- Admin-tunable targets. duplication_target = how many people each member is
-- expected to personally bring in (the "rule of three").
insert into public.app_settings (key, value) values
  ('growth_focus', jsonb_build_object(
      'duplication_target', 3,
      'window_days', 30,
      'min_prospects', 20,
      'min_presentations', 8,
      'min_follow_ups', 10,
      'min_attendance_days', 8,
      'min_evaluations', 4,
      'min_orders', 1))
on conflict (key) do nothing;

-- Scores each growth area 0–100 (how far below target the member is) and
-- returns them most urgent first. Signed-in callers may only ask about
-- themselves or members whose team data they can see; the service role
-- (cron) may ask about anyone.
create or replace function public.growth_focus(p_user uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_user   uuid := coalesce(p_user, auth.uid());
  s        jsonb := coalesce((select value from app_settings where key = 'growth_focus'), '{}'::jsonb);
  v_target int := greatest(coalesce((s ->> 'duplication_target')::int, 3), 1);
  v_from   date := current_date - coalesce((s ->> 'window_days')::int, 30);
  v_min_pros  int := coalesce((s ->> 'min_prospects')::int, 20);
  v_min_pres  int := coalesce((s ->> 'min_presentations')::int, 8);
  v_min_fu    int := coalesce((s ->> 'min_follow_ups')::int, 10);
  v_min_att   int := coalesce((s ->> 'min_attendance_days')::int, 8);
  v_min_evals int := coalesce((s ->> 'min_evaluations')::int, 4);
  v_min_ord   int := coalesce((s ->> 'min_orders')::int, 1);
  v_directs int; v_duplicated int; v_team int; v_team_pros numeric;
  v_pros int; v_pres int; v_fu int; v_joins int; v_evals int; v_att int; v_orders int;
  v_goal record;
  v_areas jsonb := '[]'::jsonb;
begin
  if v_user is null then return null; end if;
  if auth.uid() is not null and not can_view_team_data(v_user) then
    raise exception 'You are not authorised to view this member' using errcode = '42501';
  end if;

  select count(*) into v_directs from profiles where sponsor_id = v_user and status <> 'deactivated';
  select count(*) into v_duplicated from profiles d
    where d.sponsor_id = v_user and d.status <> 'deactivated'
      and (select count(*) from profiles g where g.sponsor_id = d.id and g.status <> 'deactivated') >= v_target;
  select count(*) into v_team from team_relationships where ancestor_id = v_user and depth >= 1;
  select coalesce(avg(x.p), 0) into v_team_pros from (
    select (select coalesce(sum(e.prospects), 0) from evaluations e where e.user_id = d.id and e.period_date >= v_from) as p
    from profiles d where d.sponsor_id = v_user and d.status = 'active') x;

  select coalesce(sum(prospects), 0), coalesce(sum(presentations), 0), coalesce(sum(follow_ups), 0),
         coalesce(sum(new_joins), 0), count(*)
    into v_pros, v_pres, v_fu, v_joins, v_evals
    from evaluations where user_id = v_user and period_date >= v_from;
  select count(distinct attendance_date) into v_att from attendance
    where user_id = v_user and attendance_date >= v_from and status in ('verified_in_office', 'approved_exception');
  select count(*) into v_orders from orders where member_id = v_user and order_date >= v_from and status <> 'cancelled';

  -- A submitted monthly goal overrides the default prospecting/order targets.
  select prospecting_target, order_target into v_goal from monthly_goals
    where user_id = v_user and month = date_trunc('month', current_date)::date and status <> 'draft';
  if found then
    v_min_pros := coalesce(nullif(v_goal.prospecting_target, 0), v_min_pros);
    v_min_ord  := coalesce(nullif(v_goal.order_target, 0), v_min_ord);
  end if;

  -- Personal recruiting: has the member brought in their own target yet?
  if v_directs < v_target then
    v_areas := v_areas || jsonb_build_object('key', 'recruiting',
      'score', round(100.0 * (v_target - v_directs) / v_target),
      'value', v_directs, 'target', v_target);
  end if;
  -- Duplication: are their people bringing in their own target?
  if v_directs > 0 and v_duplicated < v_directs then
    v_areas := v_areas || jsonb_build_object('key', 'duplication',
      'score', round(110.0 * (v_directs - v_duplicated) / v_directs),
      'value', v_duplicated, 'target', v_directs);
  end if;
  -- Team prospecting: are their people prospecting enough?
  if v_directs > 0 and v_team_pros < v_min_pros then
    v_areas := v_areas || jsonb_build_object('key', 'team_prospecting',
      'score', round(100.0 * (v_min_pros - v_team_pros) / v_min_pros),
      'value', round(v_team_pros), 'target', v_min_pros);
  end if;
  if v_pros < v_min_pros then
    v_areas := v_areas || jsonb_build_object('key', 'prospecting',
      'score', round(100.0 * (v_min_pros - v_pros) / v_min_pros),
      'value', v_pros, 'target', v_min_pros);
  end if;
  if v_fu < v_min_fu or v_pres < v_min_pres then
    v_areas := v_areas || jsonb_build_object('key', 'follow_up',
      'score', round(80.0 * greatest((v_min_fu - v_fu)::numeric / v_min_fu, (v_min_pres - v_pres)::numeric / v_min_pres)),
      'value', v_fu, 'target', v_min_fu, 'presentations', v_pres, 'presentations_target', v_min_pres);
  end if;
  if v_orders < v_min_ord then
    v_areas := v_areas || jsonb_build_object('key', 'sales',
      'score', round(80.0 * (v_min_ord - v_orders) / v_min_ord),
      'value', v_orders, 'target', v_min_ord);
  end if;
  if v_att < v_min_att then
    v_areas := v_areas || jsonb_build_object('key', 'consistency',
      'score', round(70.0 * (v_min_att - v_att) / v_min_att),
      'value', v_att, 'target', v_min_att);
  end if;
  if v_evals < v_min_evals then
    v_areas := v_areas || jsonb_build_object('key', 'accountability',
      'score', round(60.0 * (v_min_evals - v_evals) / v_min_evals),
      'value', v_evals, 'target', v_min_evals);
  end if;

  return jsonb_build_object(
    'duplication_target', v_target,
    'directs', v_directs,
    'duplicated', v_duplicated,
    'team_size', v_team,
    'new_joins', v_joins,
    'areas', coalesce((select jsonb_agg(a order by (a ->> 'score')::int desc) from jsonb_array_elements(v_areas) a), '[]'::jsonb));
end $$;
revoke execute on function public.growth_focus(uuid) from public, anon;
grant execute on function public.growth_focus(uuid) to authenticated, service_role;

-- Top three focus keys for every member in a branch (for the org chart).
create or replace function public.team_focus(p_root uuid default null)
returns table (member uuid, focus text[])
language plpgsql stable security definer set search_path = public as $$
declare v_root uuid := coalesce(p_root, auth.uid());
begin
  if not can_view_team_data(v_root) then
    raise exception 'You are not authorised to view this team' using errcode = '42501';
  end if;
  return query
  select tr.descendant_id,
         array(select a ->> 'key' from jsonb_array_elements(growth_focus(tr.descendant_id) -> 'areas') a limit 3)
  from team_relationships tr
  where tr.ancestor_id = v_root and tr.depth >= 1 and can_view_team_data(tr.descendant_id)
  limit 1000;
end $$;
revoke execute on function public.team_focus(uuid) from public, anon;
grant execute on function public.team_focus(uuid) to authenticated, service_role;

-- Weekly "your focus this week" notification (called by the daily cron on Mondays).
create or replace function public.run_weekly_growth_focus()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; f jsonb; v_titles text; v_count int := 0;
  v_week text := to_char(current_date, 'IYYY-IW');
begin
  for r in select id from profiles where status = 'active' and joined_at < now() - interval '3 days' loop
    if already_notified_today(r.id, 'growth_focus', v_week) then continue; end if;
    f := growth_focus(r.id);
    select string_agg(case a ->> 'key'
        when 'recruiting' then 'Personal recruiting'
        when 'duplication' then 'Leadership & duplication'
        when 'team_prospecting' then 'Coaching your team to prospect'
        when 'prospecting' then 'Prospecting'
        when 'follow_up' then 'Follow-up & presentations'
        when 'sales' then 'Sales'
        when 'consistency' then 'Consistency'
        when 'accountability' then 'Evaluations'
        else a ->> 'key' end, ', ')
      into v_titles
      from (select a from jsonb_array_elements(f -> 'areas') a limit 3) t;
    if v_titles is null then continue; end if;
    perform notify(r.id, 'growth_focus', 'Your focus this week',
      'Work on: ' || v_titles || '. Tap for tips and lessons.', '/growth', jsonb_build_object('key', v_week));
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.run_weekly_growth_focus() from public, anon, authenticated;
grant execute on function public.run_weekly_growth_focus() to service_role;

-- Live org chart: members receive new rows for their own branch.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'team_relationships') then
    alter publication supabase_realtime add table public.team_relationships;
  end if;
end $$;
