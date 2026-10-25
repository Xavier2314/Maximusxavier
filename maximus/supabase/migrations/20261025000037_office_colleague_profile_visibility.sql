-- =============================================================================
-- MAXIMUS — 0037 Let office leaders view the profile of their office's members
-- The "Reach out to" / needs-attention list on the Office dashboard links to
-- /team/[id], which loads a member's profile under RLS via can_view_member().
-- That function only allows viewing someone in your sponsor downline, or your
-- own sponsor/upline — it has no notion of "same office". So a team leader
-- clicking an office colleague who isn't in their downline got a blocked row
-- (null), which the page turns into a 404.
--
-- Extend can_view_member() to also allow anyone who can view an office's
-- roster (its manager, or a team leader assigned to it — see
-- can_view_office_roster() from 0035) to view the basic profile of that
-- office's members. This mirrors exactly who office_members() already lets
-- browse the roster; it does not touch can_view_team_data(), so activity data
-- (attendance, goals, evaluations) on that profile page stays hidden for
-- anyone outside the real downline, same as before.
-- =============================================================================

create or replace function public.can_view_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view_team_data(target)
    or exists (select 1 from public.profiles
               where id = auth.uid() and (sponsor_id = target or upline_id = target))
    or exists (select 1 from public.office_memberships om
               where om.user_id = target and public.can_view_office_roster(om.office_id))
$$;
