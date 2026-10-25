-- =============================================================================
-- MAXIMUS — 0040 Office colleagues never includes your own sponsor/upline
-- 0038 let an office-roster viewer (e.g. a Team Leader) see the activity data
-- of anyone in their office, with no regard for direction. That leaked a
-- sponsor's private NeoLife ID (member_private, gated by can_view_team_data)
-- and "what they should work on" coaching data to their own downline the
-- moment the two happened to share an office as fellow Team Leaders — exactly
-- the data 0025's can_view_team_data was designed to keep from a downline
-- ("never to their downline").
--
-- The office-colleague exception in can_view_team_data() now excludes anyone
-- who is already above the viewer in their own sponsor line. Basic profile
-- visibility is untouched (can_view_member() already has its own, correct,
-- "see your sponsor's basic profile only" clause from 0001).
-- =============================================================================

create or replace function public.can_view_team_data(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    target = auth.uid()
    or public.has_permission('view_org_analytics')
    or (public.has_permission('view_extended_downline') and public.is_in_my_downline(target))
    or (public.has_permission('view_direct_downlines') and public.is_in_my_downline(target, 1))
    or (
      exists (select 1 from public.office_memberships om
              where om.user_id = target and public.can_view_office_roster(om.office_id))
      and not exists (select 1 from public.team_relationships
                       where ancestor_id = target and descendant_id = auth.uid() and depth >= 1)
    )
$$;
