-- =============================================================================
-- MAXIMUS — 0032 Private chat between accountability partners
-- Only the two people in a conversation can read it. There is deliberately no
-- admin, sponsor or upline policy on these tables or the chat bucket.
-- Messages are encrypted in transit and at rest by Supabase, but this is NOT
-- end-to-end encryption, and the app must not claim it is.
-- A report shares only the message the reporter chooses, as a copy.
-- =============================================================================

create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  partnership_id  uuid unique references public.partnerships (id) on delete set null,
  created_at      timestamptz not null default now(),
  last_message_at timestamptz
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz,
  muted           boolean not null default false,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind            text not null default 'text' check (kind in ('text', 'image', 'file', 'voice', 'goal', 'focus_invite', 'quick')),
  body            text check (length(body) <= 4000),
  attachment_path text check (length(attachment_path) <= 300),
  attachment_name text check (length(attachment_name) <= 200),
  attachment_size integer check (attachment_size between 0 and 20971520),
  duration_ms     integer check (duration_ms between 0 and 600000),
  goal_id         uuid references public.tool_goals (id) on delete set null,
  focus_minutes   smallint check (focus_minutes between 5 and 180),
  reply_to        uuid references public.messages (id) on delete set null,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  check (deleted_at is not null or kind <> 'text' or length(trim(body)) > 0)
);
create index messages_conversation_idx on public.messages (conversation_id, created_at desc);

create table public.user_blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.message_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  message_id  uuid references public.messages (id) on delete set null,
  snapshot    text check (length(snapshot) <= 4000),
  reason      text not null check (length(trim(reason)) between 3 and 1000),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'actioned')),
  created_at  timestamptz not null default now()
);

create or replace function public.is_conversation_member(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_members where conversation_id = p_conversation and user_id = auth.uid())
$$;

-- Messages can be sent while the partnership is active and nobody has blocked the other.
create or replace function public.can_send_in(p_conversation uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from conversations c join partnerships p on p.id = c.partnership_id and p.status = 'active'
    where c.id = p_conversation and auth.uid() in (p.requester_id, p.partner_id)
      and not exists (select 1 from user_blocks b where (b.blocker_id = p.requester_id and b.blocked_id = p.partner_id)
                                                     or (b.blocker_id = p.partner_id and b.blocked_id = p.requester_id)))
$$;

alter table public.conversations enable row level security;
create policy conversations_members on public.conversations for select to authenticated using (is_conversation_member(id));

alter table public.conversation_members enable row level security;
create policy conversation_members_read on public.conversation_members for select to authenticated using (is_conversation_member(conversation_id));
create policy conversation_members_own_update on public.conversation_members for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.conversation_members from authenticated;
grant update (last_read_at, muted) on public.conversation_members to authenticated;

alter table public.messages enable row level security;
create policy messages_read on public.messages for select to authenticated using (is_conversation_member(conversation_id));
create policy messages_send on public.messages for insert to authenticated with check (
  sender_id = auth.uid() and can_send_in(conversation_id) and edited_at is null and deleted_at is null
  and (goal_id is null or exists (select 1 from tool_goals g where g.id = goal_id and g.user_id = auth.uid()))
  and (attachment_path is null or attachment_path like conversation_id::text || '/' || auth.uid()::text || '/%'));
-- Senders edit or delete their own messages only (enforced by the trigger below).
create policy messages_own_update on public.messages for update to authenticated
  using (sender_id = auth.uid()) with check (sender_id = auth.uid());
revoke update on public.messages from authenticated;
grant update (body, edited_at, deleted_at) on public.messages to authenticated;

create or replace function public.messages_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.deleted_at is not null then raise exception 'This message was deleted.'; end if;
  if new.deleted_at is not null then
    new.body := null; new.attachment_path := null; new.attachment_name := null; new.goal_id := null;
  elsif new.body is distinct from old.body then
    if old.kind <> 'text' then raise exception 'Only text messages can be edited.'; end if;
    if length(trim(coalesce(new.body, ''))) = 0 then raise exception 'Message is empty.'; end if;
    new.edited_at := now();
  end if;
  return new;
end $$;
create trigger messages_guard before update on public.messages for each row execute function public.messages_guard();

alter table public.user_blocks enable row level security;
create policy user_blocks_own on public.user_blocks for all to authenticated
  using (blocker_id = auth.uid()) with check (blocker_id = auth.uid());

alter table public.message_reports enable row level security;
create policy message_reports_insert on public.message_reports for insert to authenticated with check (reporter_id = auth.uid());
create policy message_reports_own_read on public.message_reports for select to authenticated using (reporter_id = auth.uid());
-- Super admins see reports (the reporter's chosen copy), never the conversation itself.
create policy message_reports_admin_read on public.message_reports for select to authenticated using (has_role('super_admin'));

-- Notify the other person, bump the conversation.
create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_other uuid; v_name text; v_muted boolean;
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  update conversation_members set last_read_at = new.created_at where conversation_id = new.conversation_id and user_id = new.sender_id;
  select user_id, muted into v_other, v_muted from conversation_members where conversation_id = new.conversation_id and user_id <> new.sender_id;
  if v_other is null or v_muted then return new; end if;
  -- One notification per unread burst, not one per message.
  if exists (select 1 from notifications where user_id = v_other and type = 'chat_message' and read_at is null
             and data->>'conversation_id' = new.conversation_id::text and created_at > now() - interval '30 minutes') then
    return new;
  end if;
  select full_name into v_name from profiles where id = new.sender_id;
  perform notify(v_other, 'chat_message', 'New message from ' || v_name,
    case new.kind when 'text' then left(new.body, 100) when 'voice' then 'Voice note' when 'image' then 'Photo'
                  when 'file' then 'File' when 'goal' then 'Shared a goal' when 'focus_invite' then 'Invited you to focus together' else left(new.body, 100) end,
    '/messages', jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end $$;
create trigger messages_after_insert after insert on public.messages for each row execute function public.messages_after_insert();

-- Open (or create) the chat with the active partner.
create or replace function public.open_partner_chat()
returns uuid language plpgsql security definer set search_path = public as $$
declare p partnerships%rowtype; v_id uuid;
begin
  select * into p from partnerships where status = 'active' and auth.uid() in (requester_id, partner_id) limit 1;
  if not found then raise exception 'You need an active accountability partner to chat.'; end if;
  select id into v_id from conversations where partnership_id = p.id;
  if v_id is null then
    insert into conversations (partnership_id) values (p.id) on conflict (partnership_id) do nothing returning id into v_id;
    if v_id is null then select id into v_id from conversations where partnership_id = p.id; end if;
    insert into conversation_members (conversation_id, user_id) values (v_id, p.requester_id), (v_id, p.partner_id) on conflict do nothing;
  end if;
  return v_id;
end $$;

-- The member's conversations with the other person's name and unread count.
create or replace function public.my_conversations()
returns table (id uuid, other_id uuid, full_name text, avatar_url text, last_message_at timestamptz, unread integer, can_send boolean, last_seen timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, o.user_id, pr.full_name, pr.avatar_url, c.last_message_at,
         (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id <> auth.uid()
            and m.created_at > coalesce(me.last_read_at, '-infinity')),
         can_send_in(c.id), o.last_read_at
  from conversation_members me
  join conversations c on c.id = me.conversation_id
  join conversation_members o on o.conversation_id = c.id and o.user_id <> me.user_id
  join profiles pr on pr.id = o.user_id
  where me.user_id = auth.uid()
  order by c.last_message_at desc nulls last
$$;

do $do$
declare f text;
begin
  foreach f in array array['is_conversation_member(uuid)', 'can_send_in(uuid)', 'open_partner_chat()', 'my_conversations()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$do$;

-- Realtime: new/edited messages and read receipts; typing and online status use
-- private broadcast/presence channels named "chat:<conversation id>".
do $do$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.messages, public.conversation_members;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'realtime' and table_name = 'messages') then
    execute $p$create policy "chat members broadcast read" on realtime.messages for select to authenticated
      using (realtime.topic() like 'chat:%' and public.is_conversation_member(substr(realtime.topic(), 6)::uuid))$p$;
    execute $p$create policy "chat members broadcast write" on realtime.messages for insert to authenticated
      with check (realtime.topic() like 'chat:%' and public.is_conversation_member(substr(realtime.topic(), 6)::uuid))$p$;
  end if;
end
$do$;

-- Attachments and voice notes: private bucket, path "<conversation id>/<sender id>/<file>".
do $do$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('chat', 'chat', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
        'audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/aac', 'video/mp4', 'text/plain',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword'])
    on conflict (id) do nothing;
    execute $p$create policy "chat upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'chat' and (storage.foldername(name))[2] = auth.uid()::text
                  and public.can_send_in(((storage.foldername(name))[1])::uuid))$p$;
    execute $p$create policy "chat read" on storage.objects for select to authenticated
      using (bucket_id = 'chat' and public.is_conversation_member(((storage.foldername(name))[1])::uuid))$p$;
  end if;
end
$do$;
