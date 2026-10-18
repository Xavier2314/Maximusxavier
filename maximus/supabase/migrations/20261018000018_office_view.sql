-- =============================================================================
-- MAXIMUS — 0018 Office view
-- * Office Admin and Earnings Manager roles
-- * Office managers see the activity of everyone in their office
-- * Sponsors see every level of their downline (visibility only flows down)
-- * office_dashboard(): the numbers behind the Office view
-- * office_pulse(): the small, non-personal office summary every member sees
--
-- Activity rule used everywhere below (documented in the app as well):
--   a member's last activity is their latest check-in, evaluation, order or
--   prospect update. "Inactive 7d / 14d" = no activity for 7 / 14 days.
-- =============================================================================

insert into public.roles (key, name, description, rank, is_elevated) values
  ('office_admin',     'Office Admin',     'Runs one office: members, attendance, goals and announcements', 70, true),
  ('earnings_manager', 'Earnings Manager', 'Verifies members'' payments and earnings records',              50, true)
on conflict (key) do nothing;

insert into public.role_permissions (role_id, permission_key)
select r.id, m.perm
from public.roles r
join (values
  ('office_admin',     'manage_office'),
  ('office_admin',     'view_team_dashboard'),
  ('office_admin',     'review_member_goals'),
  ('office_admin',     'approve_attendance_exceptions'),
  ('office_admin',     'publish_announcements'),
  ('earnings_manager', 'approve_financial_transactions'),
  ('earnings_manager', 'view_authorized_financials')
) as m(role_key, perm) on m.role_key = r.key
on conflict do nothing;

-- Is target a member of an office the current user manages?
create or replace function public.manages_office_of(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission('manage_office') and exists (
    select 1 from public.office_memberships t
    where t.user_id = target and (
      exists (select 1 from public.offices o where o.id = t.office_id and o.manager_id = auth.uid())
      or exists (select 1 from public.office_memberships m
                 where m.office_id = t.office_id and m.user_id = auth.uid() and m.is_manager)))
$$;

create or replace function public.can_view_team_data(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    target = auth.uid()
    or public.has_permission('view_org_analytics')
    or (public.has_permission('view_extended_downline') and public.is_in_my_downline(target))
    or (public.has_permission('view_direct_downlines') and public.is_in_my_downline(target, 1))
    or public.manages_office_of(target)
$$;

-- Sponsors see their whole structure below them (every level), never above.
-- Downline prospects stay readable to uplines (prospects_read uses can_view_team_data,
-- which only ever looks down the tree), so a downline never sees an upline's prospects.
insert into public.role_permissions (role_id, permission_key)
select id, 'view_extended_downline' from public.roles where key = 'sponsor'
on conflict do nothing;

-- Offices the current user manages (all offices for organisation admins).
create or replace function public.my_managed_offices()
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select o.id, o.name from public.offices o
  where o.is_active and public.can_manage_office(o.id)
  order by o.name
$$;

-- Latest activity per member, for the documented inactivity rule.
create or replace function public.member_last_activity(p_user uuid)
returns timestamptz language sql stable security definer set search_path = public as $$
  select greatest(
    (select max(check_in_at) from attendance where user_id = p_user),
    (select max(submitted_at) from evaluations where user_id = p_user),
    (select max(created_at) from orders where member_id = p_user),
    (select max(updated_at) from prospects where owner_id = p_user))
$$;
revoke execute on function public.member_last_activity(uuid) from public, anon, authenticated;

create or replace function public.office_dashboard(p_office uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tz     text := coalesce((select timezone from offices where id = p_office), 'Africa/Lagos');
  v_today  date := (now() at time zone v_tz)::date;
  v_month  date := date_trunc('month', v_today)::date;
  v_period date := current_evaluation_period(v_today);
  v_result jsonb;
begin
  if not can_manage_office(p_office) then
    raise exception 'You are not authorised to view this office' using errcode = '42501';
  end if;

  with m as (
    select p.id, p.full_name, p.avatar_url, p.member_id, p.joined_at, member_last_activity(p.id) as last_at
    from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
    where om.office_id = p_office
  ),
  reg as (select * from office_register(p_office, v_today)),
  days as (
    select d::date as day from generate_series(v_today - 29, v_today, interval '1 day') d
    where office_open_time(p_office, d::date) is not null
  ),
  att as (
    select days.day, count(distinct a.user_id) filter (where a.status in ('verified_in_office', 'approved_exception')) as present
    from days left join attendance a on a.office_id = p_office and a.attendance_date = days.day
      and a.user_id in (select id from m)
    group by days.day
  ),
  goals as (
    select g.user_id, g.status from monthly_goals g where g.month = v_month and g.user_id in (select id from m)
  ),
  earn as (
    select e.user_id, sum(e.earnings) as total from evaluations e
    where e.period_date >= v_month and e.user_id in (select id from m) group by e.user_id
  )
  select jsonb_build_object(
    'office',           (select jsonb_build_object('id', id, 'name', name, 'address', address) from offices where id = p_office),
    'today',            v_today,
    'members_total',    (select count(*) from m),
    'active_7d',        (select count(*) from m where last_at >= now() - interval '7 days'),
    'inactive_7d',      (select count(*) from m where last_at is null or last_at < now() - interval '7 days'),
    'inactive_14d',     (select count(*) from m where last_at is null or last_at < now() - interval '14 days'),
    'new_this_month',   (select count(*) from m where joined_at >= v_month),
    'present_now',      (select count(*) from reg where check_in_at is not null and check_out_at is null and status in ('on_time', 'late', 'present')),
    'checked_in_today', (select count(*) from reg where status in ('on_time', 'late', 'present')),
    'late_today',       (select count(*) from reg where status = 'late'),
    'absent_today',     (select count(*) from reg where status = 'absent'),
    'checked_out_today',(select count(*) from reg where check_out_at is not null),
    'open_today',       office_open_time(p_office, v_today) is not null,
    'attendance_7d',    (select case when count(*) = 0 or (select count(*) from m) = 0 then null
                           else round(100.0 * sum(present) / (count(*) * (select count(*) from m)))::int end
                         from att where day > v_today - 7),
    'attendance_30d',   (select case when count(*) = 0 or (select count(*) from m) = 0 then null
                           else round(100.0 * sum(present) / (count(*) * (select count(*) from m)))::int end from att),
    'attendance_trend', (select coalesce(jsonb_agg(jsonb_build_object('day', day, 'present', present) order by day), '[]'::jsonb)
                         from att where day > v_today - 14),
    'reported_earnings_month', (select coalesce(sum(total), 0) from earn),
    'confirmed_savings_month', (select coalesce(sum(t.direction * t.amount), 0) from financial_transactions t
                                join financial_accounts a on a.id = t.account_id
                                where a.kind = 'savings' and t.status = 'confirmed' and t.occurred_on >= v_month
                                  and t.user_id in (select id from m)),
    'pending_payments', (select count(*) from financial_transactions where status = 'pending' and user_id in (select id from m)),
    'pending_corrections', (select count(*) from attendance_corrections where status = 'pending' and office_id = p_office),
    'sales_month',      (select coalesce(sum(amount), 0) from orders where status <> 'cancelled' and order_date >= v_month
                           and member_id in (select id from m)),
    'goals_submitted',  (select count(*) from goals where status in ('submitted', 'approved')),
    'goals_awaiting_review', (select count(*) from goals where status = 'submitted'),
    'goals_missing',    (select count(*) from m where not exists (select 1 from goals g where g.user_id = m.id and g.status <> 'draft')),
    'evaluations_done', (select count(distinct e.user_id) from evaluations e where e.period_date = v_period and e.user_id in (select id from m)),
    'prospects_added_month', (select count(*) from prospects where owner_id in (select id from m) and created_at >= v_month),
    'followups_due',    (select count(*) from prospects where owner_id in (select id from m) and next_follow_up_at <= now()
                           and stage not in ('joined', 'customer', 'not_now') and not opted_out),
    'prospects_joined_month', (select count(*) from prospects where owner_id in (select id from m) and stage = 'joined' and updated_at >= v_month),
    'top_earners',      (select coalesce(jsonb_agg(x order by x.total desc), '[]'::jsonb) from (
                           select m.id, m.full_name, m.avatar_url, earn.total from earn join m on m.id = earn.user_id
                           where earn.total > 0 order by earn.total desc limit 5) x),
    'needs_attention',  (select coalesce(jsonb_agg(x order by x.last_at nulls first), '[]'::jsonb) from (
                           select m.id, m.full_name, m.avatar_url, m.last_at from m
                           where m.last_at is null or m.last_at < now() - interval '7 days'
                           order by m.last_at nulls first limit 8) x)
  ) into v_result;
  return v_result;
end $$;

-- What every member of an office may see about it: counts only, no names.
create or replace function public.office_pulse(p_office uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_office uuid := coalesce(p_office, (select office_id from profiles where id = auth.uid()));
  v_tz     text := coalesce((select timezone from offices where id = v_office), 'Africa/Lagos');
  v_today  date := (now() at time zone v_tz)::date;
begin
  if v_office is null then return null; end if;
  if not (exists (select 1 from office_memberships where office_id = v_office and user_id = auth.uid())
          or can_manage_office(v_office)) then
    raise exception 'You are not a member of this office' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'office',       (select jsonb_build_object('id', id, 'name', name) from offices where id = v_office),
    'open_today',   office_open_time(v_office, v_today) is not null,
    'members',      (select count(*) from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
                     where om.office_id = v_office),
    'present_now',  (select count(distinct user_id) from attendance where office_id = v_office and attendance_date = v_today
                     and check_out_at is null and status in ('verified_in_office', 'approved_exception')),
    'checked_in_today', (select count(distinct user_id) from attendance where office_id = v_office and attendance_date = v_today
                     and status in ('verified_in_office', 'approved_exception'))
  );
end $$;

-- Office member directory for the Office view.
create or replace function public.office_members(p_office uuid)
returns table (
  member uuid, full_name text, member_code text, avatar_url text, phone text, joined_at timestamptz,
  is_manager boolean, last_activity timestamptz, days_present_30 integer, goal_status text, evaluation_done boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz    text := coalesce((select timezone from offices where id = p_office), 'Africa/Lagos');
  v_today date := (now() at time zone v_tz)::date;
begin
  if not can_manage_office(p_office) then
    raise exception 'You are not authorised to view this office' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name, p.member_id, p.avatar_url, p.phone, p.joined_at, om.is_manager,
    member_last_activity(p.id),
    (select count(distinct a.attendance_date)::int from attendance a where a.user_id = p.id and a.office_id = p_office
       and a.attendance_date > v_today - 30 and a.status in ('verified_in_office', 'approved_exception')),
    (select g.status::text from monthly_goals g where g.user_id = p.id and g.month = date_trunc('month', v_today)::date),
    exists (select 1 from evaluations e where e.user_id = p.id and e.period_date = current_evaluation_period(v_today))
  from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
  where om.office_id = p_office
  order by p.full_name;
end $$;

do $do$
declare f text;
begin
  foreach f in array array['manages_office_of(uuid)', 'my_managed_offices()', 'office_dashboard(uuid)', 'office_pulse(uuid)', 'office_members(uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$do$;
