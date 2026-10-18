-- =============================================================================
-- MAXIMUS — 0021 Attendance reports & coaching alerts
--
-- Definitions (shown in the app too):
--   Open day      a day the office schedule has opening hours, on or after the
--                 member joined. Today counts only once they have checked in.
--   Present       a verified-in-office or approved check-in that day.
--   Late          present, but checked in after opening time + grace minutes.
--   Absent        an open day with no present check-in.
--   Absent streak open days missed since the member's last present day.
--
-- Coaching alerts are suggestions for a conversation, not judgements:
--   absences       5+ open office days missed in a row
--   no_prospecting no prospect added or updated for 7+ days
--   no_goals       no submitted goals for this month by the 5th
--   no_evaluation  no evaluation for 10+ days
--   training       had done lessons before, none in the last 30 days
--   improving      (positive) 4+ office days in the last 14, at least double the 14 before
-- Members who joined in the last 7 days are left out while they settle in.
-- =============================================================================

create or replace function public.attendance_report(p_office uuid, p_from date, p_to date)
returns table (
  member uuid, full_name text, member_code text, avatar_url text,
  open_days integer, present_days integer, late_days integer, absent_days integer,
  attendance_pct integer, absent_streak integer, last_check_in timestamptz, last_activity timestamptz
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz    text := coalesce((select timezone from offices where id = p_office), 'Africa/Lagos');
  v_grace integer := coalesce((select late_grace_minutes from offices where id = p_office), 15);
  v_today date := (now() at time zone v_tz)::date;
  v_all   boolean := can_manage_office(p_office);
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'Choose a date range of up to one year';
  end if;
  if not (v_all or has_permission('view_team_dashboard') or has_permission('view_direct_downlines')) then
    raise exception 'You are not authorised to view this report' using errcode = '42501';
  end if;
  return query
  with cal as (
    select d::date as day, office_open_time(p_office, d::date) as open_at
    from generate_series(p_from, least(p_to, v_today), interval '1 day') d
  ),
  ppl as (
    select p.id, p.full_name as fname, p.member_id as code, p.avatar_url as avatar, (p.joined_at at time zone v_tz)::date as joined
    from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
    where om.office_id = p_office and (v_all or (om.user_id <> auth.uid() and can_view_team_data(om.user_id)))
  ),
  grid as (
    select ppl.id, cal.day, cal.open_at, a.check_in_at
    from ppl join cal on cal.open_at is not null and cal.day >= ppl.joined
    left join lateral (
      select x.check_in_at from attendance x
      where x.user_id = ppl.id and x.attendance_date = cal.day and x.status in ('verified_in_office', 'approved_exception')
      order by x.check_in_at limit 1) a on true
    where not (cal.day = v_today and a.check_in_at is null)
  ),
  last_present as (select g.id, max(g.day) filter (where g.check_in_at is not null) as day from grid g group by g.id)
  select ppl.id, ppl.fname, ppl.code, ppl.avatar,
    count(g.day)::int,
    count(g.check_in_at)::int,
    (count(*) filter (where g.check_in_at is not null
       and (g.check_in_at at time zone v_tz)::time > g.open_at + make_interval(mins => v_grace)))::int,
    (count(g.day) - count(g.check_in_at))::int,
    case when count(g.day) = 0 then null else round(100.0 * count(g.check_in_at) / count(g.day))::int end,
    (count(*) filter (where g.day is not null and g.check_in_at is null
       and g.day > coalesce(lp.day, date '1900-01-01')))::int,
    (select max(x.check_in_at) from attendance x where x.user_id = ppl.id),
    member_last_activity(ppl.id)
  from ppl
  left join grid g on g.id = ppl.id
  left join last_present lp on lp.id = ppl.id
  group by ppl.id, ppl.fname, ppl.code, ppl.avatar, lp.day
  order by 9 nulls last, ppl.fname;
end $$;

-- Per open day: how many were present, late and absent (for the trend chart).
create or replace function public.attendance_daily(p_office uuid, p_from date, p_to date)
returns table (day date, present integer, late integer, absent integer)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz    text := coalesce((select timezone from offices where id = p_office), 'Africa/Lagos');
  v_grace integer := coalesce((select late_grace_minutes from offices where id = p_office), 15);
  v_today date := (now() at time zone v_tz)::date;
begin
  if not can_manage_office(p_office) then
    raise exception 'You are not authorised to view this office' using errcode = '42501';
  end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 366 then
    raise exception 'Choose a date range of up to one year';
  end if;
  return query
  with cal as (
    select d::date as dd, office_open_time(p_office, d::date) as open_at
    from generate_series(p_from, least(p_to, v_today), interval '1 day') d
  ),
  ppl as (
    select p.id, (p.joined_at at time zone v_tz)::date as joined
    from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
    where om.office_id = p_office
  ),
  grid as (
    select cal.dd, cal.open_at, a.check_in_at
    from cal join ppl on cal.open_at is not null and cal.dd >= ppl.joined
    left join lateral (
      select x.check_in_at from attendance x
      where x.user_id = ppl.id and x.attendance_date = cal.dd and x.status in ('verified_in_office', 'approved_exception')
      order by x.check_in_at limit 1) a on true
  )
  select g.dd,
    count(g.check_in_at)::int,
    (count(*) filter (where g.check_in_at is not null
       and (g.check_in_at at time zone v_tz)::time > g.open_at + make_interval(mins => v_grace)))::int,
    case when g.dd = v_today then 0 else (count(*) - count(g.check_in_at))::int end
  from grid g group by g.dd order by g.dd;
end $$;

-- Coaching alerts for an office (managers) or the caller's own team (leaders).
create or replace function public.leadership_alerts(p_office uuid default null)
returns table (member uuid, full_name text, avatar_url text, kind text, detail text, positive boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_month date := date_trunc('month', v_today)::date;
begin
  if p_office is not null and not can_manage_office(p_office) then
    raise exception 'You are not authorised to view this office' using errcode = '42501';
  end if;
  return query
  with ppl as (
    select p.id, p.full_name as fname, p.avatar_url as avatar, p.office_id, p.joined_at
    from profiles p
    where p.status = 'active' and p.id <> auth.uid() and p.joined_at < now() - interval '7 days'
      and case when p_office is not null
               then exists (select 1 from office_memberships om where om.office_id = p_office and om.user_id = p.id)
               else exists (select 1 from team_relationships t where t.ancestor_id = auth.uid() and t.descendant_id = p.id and t.depth >= 1)
                    and can_view_team_data(p.id) end
  ),
  att as (
    select ppl.id,
      (select max(x.attendance_date) from attendance x where x.user_id = ppl.id and x.status in ('verified_in_office', 'approved_exception')) as last_day,
      (select count(distinct x.attendance_date) from attendance x where x.user_id = ppl.id and x.status in ('verified_in_office', 'approved_exception')
         and x.attendance_date > v_today - 14) as recent,
      (select count(distinct x.attendance_date) from attendance x where x.user_id = ppl.id and x.status in ('verified_in_office', 'approved_exception')
         and x.attendance_date between v_today - 28 and v_today - 14) as before
    from ppl
  ),
  missed as (
    select ppl.id, (select count(*) from generate_series(greatest(coalesce(att.last_day, (ppl.joined_at)::date - 1) + 1, v_today - 60), v_today - 1, interval '1 day') d
                    where ppl.office_id is not null and office_open_time(ppl.office_id, d::date) is not null)::int as n
    from ppl join att on att.id = ppl.id
  ),
  prosp as (
    select ppl.id, greatest((select max(updated_at) from prospects where owner_id = ppl.id),
                            (select max(created_at) from prospect_messages where owner_id = ppl.id)) as last_at
    from ppl
  )
  select ppl.id, ppl.fname, ppl.avatar, 'absences', 'Missed the last ' || missed.n || ' office days', false
    from ppl join missed on missed.id = ppl.id where missed.n >= 5
  union all
  select ppl.id, ppl.fname, ppl.avatar, 'no_prospecting',
    case when prosp.last_at is null then 'Hasn''t added any prospects yet'
         else 'No prospecting activity for ' || (v_today - (prosp.last_at)::date) || ' days' end, false
    from ppl join prosp on prosp.id = ppl.id where prosp.last_at is null or prosp.last_at < now() - interval '7 days'
  union all
  select ppl.id, ppl.fname, ppl.avatar, 'no_goals', 'No goals submitted for ' || to_char(v_month, 'FMMonth'), false
    from ppl where extract(day from v_today) >= 5
      and not exists (select 1 from monthly_goals g where g.user_id = ppl.id and g.month = v_month and g.status <> 'draft')
  union all
  select ppl.id, ppl.fname, ppl.avatar, 'no_evaluation',
    coalesce('Last evaluation ' || (v_today - (select max(e.submitted_at) from evaluations e where e.user_id = ppl.id)::date) || ' days ago', 'Hasn''t done an evaluation yet'), false
    from ppl where ppl.joined_at < now() - interval '10 days'
      and not exists (select 1 from evaluations e where e.user_id = ppl.id and e.submitted_at > now() - interval '10 days')
  union all
  select ppl.id, ppl.fname, ppl.avatar, 'training', 'No Academy lessons in the last 30 days', false
    from ppl where exists (select 1 from course_progress c where c.user_id = ppl.id)
      and not exists (select 1 from course_progress c where c.user_id = ppl.id and c.completed_at > now() - interval '30 days')
  union all
  select ppl.id, ppl.fname, ppl.avatar, 'improving',
    'In the office ' || att.recent || ' days in the last 2 weeks (was ' || att.before || ')', true
    from ppl join att on att.id = ppl.id where att.recent >= 4 and att.recent >= 2 * att.before;
end $$;

do $do$
declare f text;
begin
  foreach f in array array['attendance_report(uuid, date, date)', 'attendance_daily(uuid, date, date)', 'leadership_alerts(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$do$;
