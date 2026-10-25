-- =============================================================================
-- MAXIMUS — 0041 Let office-assigned Team Leaders post an office announcement
-- Office-audience announcements required publish_announcements (director,
-- office_admin) plus can_manage_office() — a plain Team Leader assigned to an
-- office (same roster-view relationship added in 0035) had no way to post a
-- broadcast to their own office, even though they already lead it day to day.
--
-- can_publish()'s office branch now uses can_view_office_roster(), which
-- already covers everyone the old check did (it includes can_manage_office)
-- plus a Team Leader who belongs to that office. my_postable_offices() lists,
-- for the current user, the offices they're now allowed to post to.
-- =============================================================================

create or replace function public.can_publish(p_kind public.announcement_kind, p_audience public.announcement_audience,
                                              p_office uuid, p_recipient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    -- Leaders may recognise members of their own team, to their own team.
    when p_kind = 'recognition' and p_audience = 'team' then
      public.has_permission('view_team_dashboard') and public.can_view_team_data(p_recipient)
    when p_audience = 'office' then
      public.can_view_office_roster(p_office)
    when p_audience = 'team' then
      public.has_permission('publish_announcements')
    else
      public.has_permission('publish_announcements') and public.has_permission('view_org_analytics')
  end
$$;

-- Offices the current user may post an office-wide announcement to.
create or replace function public.my_postable_offices()
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select o.id, o.name from public.offices o
  where o.is_active and public.can_view_office_roster(o.id)
  order by o.name
$$;

revoke execute on function public.my_postable_offices() from public, anon;
grant execute on function public.my_postable_offices() to authenticated;
