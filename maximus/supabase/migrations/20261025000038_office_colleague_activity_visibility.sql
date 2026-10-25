-- =============================================================================
-- MAXIMUS — 0038 Let office leaders see their office members' activity data
-- can_view_team_data() is the single choke point gating read access to
-- attendance, monthly_goals, evaluations, orders (and feedback on goals/
-- evaluations) — everywhere "can this leader see this member's data?" is
-- asked. It only ever checked the sponsor-downline relationship, so a team
-- leader (or even a real office manager) hit "not authorised" on any office
-- colleague who wasn't also in their personal downline — exactly what showed
-- up as "Activity is private" / goals blocked on /team/[id] for an office
-- colleague in 0037.
--
-- Add the same office-roster exception used in 0037's can_view_member(): if
-- the viewer can view an office's roster (its manager, or a team leader
-- assigned to it, via can_view_office_roster() from 0035) they can see the
-- activity of that office's members too. This also quietly fixes the same
-- gap for real office managers, who previously couldn't see a non-downline
-- office member's goals/evaluations/orders either (only attendance had a
-- can_manage_office() exception).
-- =============================================================================

create or replace function public.can_view_team_data(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    target = auth.uid()
    or public.has_permission('view_org_analytics')
    or (public.has_permission('view_extended_downline') and public.is_in_my_downline(target))
    or (public.has_permission('view_direct_downlines') and public.is_in_my_downline(target, 1))
    or exists (select 1 from public.office_memberships om
               where om.user_id = target and public.can_view_office_roster(om.office_id))
$$;
