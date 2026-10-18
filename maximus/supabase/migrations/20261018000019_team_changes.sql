-- =============================================================================
-- MAXIMUS — 0019 Team changes
-- * Uplines can add a profile photo for someone in their downline
-- * Uplines can remove someone who has left. They choose who in that person's
--   team left too; everyone who stays moves directly under the upline.
--   Removed members are deactivated (not deleted), so an admin can restore them.
-- * Super Admins (anyone) and Team Leaders (their own team) set a member's home office
-- =============================================================================

-- May the current user manage this member's place in the team?
create or replace function public.can_edit_downline(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target <> auth.uid() and (public.is_in_my_downline(target) or public.has_permission('manage_roles'))
$$;

create or replace function public.set_member_photo(p_target uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_edit_downline(p_target) then
    raise exception 'You can only add photos for people in your team' using errcode = '42501';
  end if;
  if p_url is null or p_url not like '%/storage/v1/object/public/avatars/' || p_target::text || '/%' then
    raise exception 'Invalid photo';
  end if;
  update profiles set avatar_url = p_url where id = p_target;
  perform write_audit('photo_set_by_upline', 'profile', p_target::text, '{}'::jsonb);
end $$;

create or replace function public.remove_from_team(p_target uuid, p_also_leaving uuid[] default '{}', p_reason text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_leaving     uuid[];
  v_new_sponsor uuid;
  v_name        text := (select full_name from profiles where id = p_target);
  v_me          text := (select full_name from profiles where id = auth.uid());
  v_moved       integer := 0;
  v_removed     integer := 0;
  r             record;
begin
  if not can_edit_downline(p_target) then
    raise exception 'You can only remove people in your own team' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(coalesce(p_also_leaving, '{}')) x
             where not exists (select 1 from team_relationships t
                               where t.ancestor_id = p_target and t.descendant_id = x and t.depth >= 1)) then
    raise exception 'Only people in their team can be removed with them';
  end if;
  v_leaving := array(select distinct x from unnest(array[p_target] || coalesce(p_also_leaving, '{}')) x);
  -- Those who stay join the remover's own team; an admin outside the line uses the leaver's sponsor.
  v_new_sponsor := case when is_in_my_downline(p_target) then auth.uid()
                        else (select sponsor_id from profiles where id = p_target) end;

  for r in select id from profiles where sponsor_id = any (v_leaving) and not (id = any (v_leaving)) loop
    update profiles set sponsor_id = v_new_sponsor where id = r.id;
    perform notify(r.id, 'team_change', 'Your sponsor has changed',
      case when v_new_sponsor = auth.uid() then coalesce(v_me, 'Your upline') || ' is now your sponsor.'
           else 'You have been moved to a new sponsor.' end, '/team', '{}'::jsonb);
    v_moved := v_moved + 1;
  end loop;

  update profiles set status = 'deactivated' where id = any (v_leaving) and status <> 'deactivated';
  get diagnostics v_removed = row_count;

  perform write_audit('removed_from_team', 'profile', p_target::text, jsonb_build_object(
    'name', v_name, 'also_leaving', p_also_leaving, 'moved', v_moved, 'new_sponsor', v_new_sponsor, 'reason', left(p_reason, 300)));
  return jsonb_build_object('removed', v_removed, 'moved', v_moved);
end $$;

-- Super Admin (anyone) or Team Leader (own team only): set a member's home office (fixes "joined the wrong office").
create or replace function public.set_member_office(p_target uuid, p_office uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_old uuid := (select office_id from profiles where id = p_target);
begin
  if not (has_role('super_admin') or (has_role('team_leader') and is_in_my_downline(p_target))) then
    raise exception 'Only a Super Admin, or a Team Leader for their own team, can change a member''s office' using errcode = '42501';
  end if;
  if not exists (select 1 from offices where id = p_office and is_active) then
    raise exception 'Choose an active office';
  end if;
  update profiles set office_id = p_office where id = p_target;
  if not found then raise exception 'Member not found'; end if;
  -- Leave the old office (managers keep any office they manage).
  delete from office_memberships where user_id = p_target and office_id <> p_office and not is_manager;
  insert into office_memberships (office_id, user_id, assigned_by) values (p_office, p_target, auth.uid())
  on conflict (office_id, user_id) do nothing;
  perform write_audit('office_changed', 'profile', p_target::text, jsonb_build_object('from', v_old, 'to', p_office));
  perform notify(p_target, 'team_change', 'Your office has been updated',
    'You are now a member of ' || (select name from offices where id = p_office) || '.', '/attendance', '{}'::jsonb);
end $$;

-- Uplines may upload a photo into a downline member's avatar folder.
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    execute $p$create policy "avatars downline write" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and public.can_edit_downline(((storage.foldername(name))[1])::uuid))$p$;
  end if;
end $$;

do $do$
declare f text;
begin
  foreach f in array array['can_edit_downline(uuid)', 'set_member_photo(uuid, text)', 'remove_from_team(uuid, uuid[], text)', 'set_member_office(uuid, uuid)']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$do$;
