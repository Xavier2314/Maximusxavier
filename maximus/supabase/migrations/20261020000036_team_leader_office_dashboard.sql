-- =============================================================================
-- MAXIMUS — 0036 Team leaders can view the full office dashboard, read-only
-- Part of the three-way "My view / Team view / Office view" split: a team
-- leader assigned to an office now gets an "Office view" tab that shows the
-- real office dashboard (attendance, goals, money, top earners) — the same
-- data an office manager sees — but strictly read-only. office_dashboard()
-- was gated to can_manage_office(), which the team_leader role doesn't carry;
-- swap it for can_view_office_roster() (added in 0035), which already allows
-- a team leader to read the office they belong to without granting
-- manage_office, so they still can't edit office settings, branding, or the
-- QR poster.
-- =============================================================================

create or replace function public.office_dashboard(p_office uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_tz     text := coalesce((select timezone from offices where id = p_office), 'Africa/Lagos');
  v_today  date := (now() at time zone v_tz)::date;
  v_month  date := date_trunc('month', v_today)::date;
  v_period date := current_evaluation_period(v_today);
  v_result jsonb;
begin
  if not can_view_office_roster(p_office) then
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

revoke execute on function public.office_dashboard(uuid) from public, anon;
grant execute on function public.office_dashboard(uuid) to authenticated;
