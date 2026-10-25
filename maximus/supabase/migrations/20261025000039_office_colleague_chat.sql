-- =============================================================================
-- MAXIMUS — 0039 Let office leaders privately chat with their office colleagues
-- Private team chat (0033) was deliberately scoped to the sponsor line only
-- ("no admin, office or third-party access"). Team Leaders can now see the
-- profile, goals and activity of members in an office they lead (0035, 0037,
-- 0038), but still couldn't message them — open_team_chat only allowed
-- sponsor-line pairs. This widens the private-chat relationship to also cover
-- office colleagues: anyone who can view an office's roster (its manager, or
-- a Team Leader assigned to it) can open a chat with members of that office,
-- and that member can reply. It stays a private two-person thread; nobody
-- else gets access to it.
-- =============================================================================

-- Parametrised twin of can_view_office_roster(): does user `a` have
-- roster-view access to office `p_office`? (can_view_office_roster() only
-- ever answers for auth.uid(), so it can't be reused for an arbitrary pair.)
create or replace function public.user_can_view_office_roster(a uuid, p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    exists (
      select 1 from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.profiles p on p.id = ur.user_id
      where ur.user_id = a and p.status = 'active' and rp.permission_key = 'view_org_analytics'
    )
    or (
      exists (
        select 1 from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.profiles p on p.id = ur.user_id
        where ur.user_id = a and p.status = 'active' and rp.permission_key = 'manage_office'
      )
      and (
        exists (select 1 from public.offices o where o.id = p_office and o.manager_id = a)
        or exists (select 1 from public.office_memberships om where om.office_id = p_office and om.user_id = a and om.is_manager)
      )
    )
    or (
      exists (
        select 1 from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.profiles p on p.id = ur.user_id
        where ur.user_id = a and p.status = 'active' and rp.permission_key in ('view_team_dashboard', 'view_direct_downlines')
      )
      and exists (select 1 from public.office_memberships om where om.office_id = p_office and om.user_id = a)
    )
$$;

-- Is `b` in an office whose roster `a` can view?
create or replace function public.office_colleagues(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and exists (
    select 1 from public.office_memberships om
    where om.user_id = b and public.user_can_view_office_roster(a, om.office_id)
  )
$$;

-- The full private-chat relationship: sponsor line (either direction) or
-- office colleagues (either direction, so the non-leader side can reply).
create or replace function public.can_team_chat(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.in_same_line(a, b) or public.office_colleagues(a, b) or public.office_colleagues(b, a)
$$;

-- Convenience wrapper for the app: can the current user chat with p_other?
create or replace function public.can_chat_with(p_other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_team_chat(auth.uid(), p_other)
$$;

create or replace function public.can_send_in(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c
    left join partnerships p on p.id = c.partnership_id
    where c.id = p_conversation
      and exists (select 1 from conversation_members m where m.conversation_id = c.id and m.user_id = auth.uid())
      and case c.kind
            when 'partner' then p.status = 'active' and auth.uid() in (p.requester_id, p.partner_id)
            else public.can_team_chat(c.member_low, c.member_high) end
      and not exists (select 1 from user_blocks b join conversation_members x on x.conversation_id = c.id and x.user_id = b.blocked_id
                      join conversation_members y on y.conversation_id = c.id and y.user_id = b.blocker_id
                      where x.user_id <> y.user_id))
$$;

create or replace function public.open_team_chat(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; lo uuid := least(auth.uid(), p_other); hi uuid := greatest(auth.uid(), p_other);
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not public.can_team_chat(auth.uid(), p_other) then
    raise exception 'You can chat privately with people in your sponsor line, or members of an office you lead.';
  end if;
  select id into v_id from conversations where kind = 'team' and member_low = lo and member_high = hi;
  if v_id is null then
    insert into conversations (kind, member_low, member_high) values ('team', lo, hi)
      on conflict (member_low, member_high) where kind = 'team' do nothing returning id into v_id;
    if v_id is null then select id into v_id from conversations where kind = 'team' and member_low = lo and member_high = hi; end if;
    insert into conversation_members (conversation_id, user_id) values (v_id, lo), (v_id, hi) on conflict do nothing;
  end if;
  return v_id;
end $$;

revoke execute on function public.user_can_view_office_roster(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.office_colleagues(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_team_chat(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.can_chat_with(uuid) from public, anon;
grant execute on function public.can_chat_with(uuid) to authenticated;
