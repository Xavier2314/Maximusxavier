-- =============================================================================
-- MAXIMUS — 0026 Upline invites
-- A one-time code that lets someone join ABOVE an existing member, e.g. the
-- founder's own sponsor joining after the founder. When the new member signs
-- up with the code, the invited-for member is placed directly under them.
-- =============================================================================

create table public.upline_invites (
  code        text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  for_user    uuid not null references public.profiles (id) on delete cascade,
  created_by  uuid default auth.uid() references public.profiles (id) on delete set null,
  used_by     uuid references public.profiles (id) on delete set null,
  used_at     timestamptz,
  expires_at  timestamptz not null default now() + interval '30 days',
  created_at  timestamptz not null default now()
);
alter table public.upline_invites enable row level security;
create policy upline_invites_read on public.upline_invites for select to authenticated
  using (for_user = auth.uid() or created_by = auth.uid() or public.has_role('super_admin'));

-- Shown on the sign-up page: whose sponsor you are joining as (valid, unused codes only).
create or replace function public.upline_invite_info(p_code text)
returns table (for_name text, for_member_id text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.member_id from upline_invites i join profiles p on p.id = i.for_user
  where i.code = upper(trim(p_code)) and i.used_by is null and i.expires_at > now()
$$;

-- Called by the newly registered member. Places the invited-for member under them.
create or replace function public.accept_upline_invite(p_code text)
returns text language plpgsql security definer set search_path = public as $$
declare v upline_invites%rowtype; v_name text; v_for_name text;
begin
  select * into v from upline_invites where code = upper(trim(p_code)) for update;
  if not found or v.used_by is not null or v.expires_at <= now() then
    raise exception 'This invite code is not valid any more';
  end if;
  if not exists (select 1 from profiles where id = auth.uid() and joined_at > now() - interval '1 hour') then
    raise exception 'Upline invites can only be used when creating a new account';
  end if;
  if v.for_user = auth.uid() then raise exception 'You cannot sponsor yourself'; end if;
  update profiles set sponsor_id = auth.uid() where id = v.for_user;
  update upline_invites set used_by = auth.uid(), used_at = now() where code = v.code;
  select full_name into v_name from profiles where id = auth.uid();
  select full_name into v_for_name from profiles where id = v.for_user;
  perform notify(auth.uid(), 'team_change', 'Welcome as ' || v_for_name || '''s sponsor',
    'You''re now above ' || v_for_name || ' in the team and can see their whole team.', '/team', '{}'::jsonb);
  perform notify(v.for_user, 'team_change', v_name || ' joined as your sponsor',
    v_name || ' is now directly above you in the team.', '/team', '{}'::jsonb);
  perform write_audit('upline_invite_used', 'profile', v.for_user::text, jsonb_build_object('code', v.code, 'sponsor', auth.uid()));
  return v_for_name;
end $$;

revoke execute on function public.upline_invite_info(text) from public;
grant execute on function public.upline_invite_info(text) to anon, authenticated;
revoke execute on function public.accept_upline_invite(text) from public, anon;
grant execute on function public.accept_upline_invite(text) to authenticated;
