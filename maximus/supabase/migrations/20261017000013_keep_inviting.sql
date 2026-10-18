-- =============================================================================
-- MAXIMUS — 0013 Keep everyone inviting
-- 3 direct recruits is the minimum goal, never a limit. Members are measured on
-- whether they keep prospecting and inviting, and get a nudge with clear steps
-- when they stop.
-- =============================================================================

update public.app_settings set value = value || jsonb_build_object('min_invites_week', 10, 'nudge_after_days', 3)
where key = 'growth_focus';

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
  v_min_inv   int := coalesce((s ->> 'min_invites_week')::int, 10);
  v_invites int; v_added int;
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
  -- Prospects added in the Prospects tool count too, whichever is higher.
  select count(*) into v_added from prospects where owner_id = v_user and created_at >= v_from;
  v_pros := greatest(v_pros, v_added);
  -- Invitations this week: new prospects plus messages sent to prospects.
  select (select count(*) from prospects where owner_id = v_user and created_at >= now() - interval '7 days')
       + (select count(*) from prospect_messages where owner_id = v_user and direction = 'out'
            and status in ('sent', 'logged') and created_at >= now() - interval '7 days')
    into v_invites;
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
  -- Inviting never stops: 3 is the minimum, not a limit.
  if v_invites < v_min_inv then
    v_areas := v_areas || jsonb_build_object('key', 'inviting',
      'score', round(95.0 * (v_min_inv - v_invites) / v_min_inv),
      'value', v_invites, 'target', v_min_inv);
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

-- "You haven't invited anyone in 3 days": tells the member exactly what to do.
create or replace function public.run_prospecting_nudges()
returns integer language plpgsql security definer set search_path = public as $$
declare
  r record; v_count int := 0;
  v_days int := coalesce((select (value ->> 'nudge_after_days')::int from app_settings where key = 'growth_focus'), 3);
  v_since timestamptz := now() - make_interval(days => v_days);
begin
  for r in
    select p.id, p.full_name from profiles p
    where p.status = 'active' and p.joined_at < v_since
      and not exists (select 1 from prospects x where x.owner_id = p.id and x.created_at >= v_since)
      and not exists (select 1 from prospect_messages m where m.owner_id = p.id and m.direction = 'out' and m.created_at >= v_since)
      and not exists (select 1 from evaluations e where e.user_id = p.id and e.prospects > 0 and e.submitted_at >= v_since)
      and not exists (select 1 from notifications n where n.user_id = p.id and n.type = 'prospecting_nudge' and n.created_at >= v_since)
  loop
    perform notify(r.id, 'prospecting_nudge', 'Time to invite someone today',
      'You haven''t added or contacted a prospect in ' || v_days || ' days. Today: write down 5 names, message 3 of them, and add them in Prospects so Maximus AI can help you follow up.',
      '/prospects', '{}'::jsonb);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;
revoke execute on function public.run_prospecting_nudges() from public, anon, authenticated;
grant execute on function public.run_prospecting_nudges() to service_role;

-- Weekly message: include the new "inviting" area in its wording.
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
        when 'recruiting' then 'Bringing in your first 3'
        when 'inviting' then 'Inviting new people'
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
