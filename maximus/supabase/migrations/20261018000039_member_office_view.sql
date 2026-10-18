-- =============================================================================
-- MAXIMUS — 0039 Member office view
-- A read-only summary of a member's own office: head counts and who runs it.
-- Only totals and leader contacts; never other members' attendance or money.
-- =============================================================================

create or replace function public.office_public_summary(p_office uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not (exists (select 1 from profiles where id = auth.uid() and office_id = p_office)
          or exists (select 1 from office_memberships where office_id = p_office and user_id = auth.uid())
          or can_manage_office(p_office)) then
    raise exception 'You can only view your own office' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'members', (select count(*) from profiles where office_id = p_office and status = 'active'),
    'checked_in_today', (select count(distinct user_id) from attendance where office_id = p_office and attendance_date = v_today),
    'leaders', coalesce((
      select jsonb_agg(jsonb_build_object('name', p.full_name, 'avatar', p.avatar_url, 'member_id', p.member_id, 'whatsapp', p.whatsapp)
                       order by p.full_name)
      from profiles p
      where p.id in (select manager_id from offices where id = p_office
                     union select user_id from office_memberships where office_id = p_office and is_manager)
    ), '[]'::jsonb));
end $$;

revoke execute on function public.office_public_summary(uuid) from public, anon;
grant execute on function public.office_public_summary(uuid) to authenticated;
