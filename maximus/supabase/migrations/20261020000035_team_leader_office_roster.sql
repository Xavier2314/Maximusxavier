-- =============================================================================
-- MAXIMUS — 0035 Team leaders can see their office roster
-- Team leaders (view_team_dashboard / view_direct_downlines) could only see a
-- member *count* for their office, with no way to see who the members are —
-- the roster page (office_members) required manage_office, which the
-- team_leader role doesn't carry. This lets a team leader view the roster of
-- the office they belong to, read-only. It does not grant manage_office, so
-- they still can't edit office settings, branding, or the QR poster.
-- =============================================================================

create or replace function public.can_view_office_roster(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_office(p_office)
      or ((public.has_permission('view_team_dashboard') or public.has_permission('view_direct_downlines'))
          and exists (select 1 from public.office_memberships where office_id = p_office and user_id = auth.uid()))
$$;

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
  if not can_view_office_roster(p_office) then
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

revoke execute on function public.can_view_office_roster(uuid) from public, anon;
grant execute on function public.can_view_office_roster(uuid) to authenticated;
revoke execute on function public.office_members(uuid) from public, anon;
grant execute on function public.office_members(uuid) to authenticated;
