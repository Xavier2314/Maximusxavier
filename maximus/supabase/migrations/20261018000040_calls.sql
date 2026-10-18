-- =============================================================================
-- MAXIMUS — 0040 Voice and video calls
-- Direct calls happen inside a private chat: only its two members can join.
-- Group calls are started by an office's managers for that office's members.
-- The media itself runs on Daily.co; the app hands out a short-lived token
-- only after can_join_call() says yes.
-- =============================================================================

create table public.calls (
  id              uuid primary key default gen_random_uuid(),
  kind            text not null check (kind in ('direct', 'group')),
  conversation_id uuid references public.conversations (id) on delete cascade,
  office_id       uuid references public.offices (id) on delete cascade,
  title           text check (length(trim(title)) between 1 and 120),
  room_name       text not null unique default ('mx-' || replace(gen_random_uuid()::text, '-', '')),
  video           boolean not null default false,
  created_by      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  status          text not null default 'ringing' check (status in ('ringing', 'active', 'ended')),
  created_at      timestamptz not null default now(),
  answered_at     timestamptz,
  ended_at        timestamptz,
  check ((kind = 'direct') = (conversation_id is not null)),
  check ((kind = 'group') = (office_id is not null))
);
create index calls_conversation_idx on public.calls (conversation_id, created_at desc);
create index calls_office_idx on public.calls (office_id, created_at desc);

create or replace function public.can_join_call(p_call uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from calls c
    where c.id = p_call and (
      (c.kind = 'direct' and exists (select 1 from conversation_members m where m.conversation_id = c.conversation_id and m.user_id = auth.uid()))
      or (c.kind = 'group' and (
            c.created_by = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.office_id = c.office_id and p.status = 'active')
         or can_manage_office(c.office_id)))
    ))
$$;

alter table public.calls enable row level security;
create policy calls_read on public.calls for select to authenticated using (public.can_join_call(id));

-- Ring the other person in a private chat.
create or replace function public.start_direct_call(p_conversation uuid, p_video boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_other uuid; v_name text; v_id uuid;
begin
  if not exists (select 1 from conversation_members where conversation_id = p_conversation and user_id = auth.uid()) then
    raise exception 'You are not in this chat' using errcode = '42501';
  end if;
  select user_id into v_other from conversation_members where conversation_id = p_conversation and user_id <> auth.uid() limit 1;
  if v_other is null then raise exception 'Nobody to call in this chat'; end if;
  if exists (select 1 from user_blocks where (blocker_id = v_other and blocked_id = auth.uid()) or (blocker_id = auth.uid() and blocked_id = v_other)) then
    raise exception 'You can''t call this person.' using errcode = '42501';
  end if;
  if (select count(*) from calls where created_by = auth.uid() and created_at > now() - interval '10 minutes') >= 10 then
    raise exception 'Too many calls. Please wait a few minutes.';
  end if;
  -- Close any earlier call left open in this chat.
  update calls set status = 'ended', ended_at = now() where conversation_id = p_conversation and status <> 'ended';
  insert into calls (kind, conversation_id, video) values ('direct', p_conversation, coalesce(p_video, false)) returning id into v_id;
  select full_name into v_name from profiles where id = auth.uid();
  perform notify(v_other, 'call', case when p_video then '🎥 ' else '📞 ' end || v_name || ' is calling you',
    'Tap to join the ' || case when p_video then 'video' else 'voice' end || ' call.', '/calls/' || v_id, jsonb_build_object('call_id', v_id));
  return v_id;
end $$;

-- Start a call for everyone in an office (its managers only).
create or replace function public.start_group_call(p_office uuid, p_title text, p_video boolean default true)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text; r record;
begin
  if not can_manage_office(p_office) then raise exception 'Only this office''s managers can start an office call' using errcode = '42501'; end if;
  insert into calls (kind, office_id, title, video) values ('group', p_office, nullif(trim(p_title), ''), coalesce(p_video, true)) returning id into v_id;
  select full_name into v_name from profiles where id = auth.uid();
  for r in select id from profiles where office_id = p_office and status = 'active' and id <> auth.uid() loop
    perform notify(r.id, 'call', '📣 ' || coalesce(nullif(trim(p_title), ''), 'Office call') || ' is live',
      v_name || ' started an office call. Tap to join.', '/calls/' || v_id, jsonb_build_object('call_id', v_id));
  end loop;
  return v_id;
end $$;

-- Someone other than the caller opened the call.
create or replace function public.join_call(p_call uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_join_call(p_call) then raise exception 'You can''t join this call' using errcode = '42501'; end if;
  update calls set status = 'active', answered_at = coalesce(answered_at, now())
    where id = p_call and status = 'ringing' and created_by <> auth.uid();
end $$;

create or replace function public.end_call(p_call uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_join_call(p_call) then raise exception 'You can''t end this call' using errcode = '42501'; end if;
  -- Group calls end only when their host (or an office manager) ends them.
  update calls set status = 'ended', ended_at = now()
    where id = p_call and status <> 'ended'
      and (kind = 'direct' or created_by = auth.uid() or can_manage_office(office_id));
end $$;

revoke execute on function public.can_join_call(uuid), public.start_direct_call(uuid, boolean),
  public.start_group_call(uuid, text, boolean), public.join_call(uuid), public.end_call(uuid) from public, anon;
grant execute on function public.can_join_call(uuid), public.start_direct_call(uuid, boolean),
  public.start_group_call(uuid, text, boolean), public.join_call(uuid), public.end_call(uuid) to authenticated;

-- Live updates, so a call screen closes when the other side hangs up.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;
