-- =============================================================================
-- MAXIMUS — 0033 Private chats along the sponsor line
-- A member can privately chat with anyone directly above or below them in the
-- team tree (sponsor <-> downline, upline <-> downline). Still only the two
-- people can read it: no admin, office or third-party access.
-- =============================================================================
alter table public.conversations
  add column kind text not null default 'partner' check (kind in ('partner', 'team')),
  add column member_low uuid references public.profiles (id) on delete cascade,
  add column member_high uuid references public.profiles (id) on delete cascade;
create unique index conversations_team_pair on public.conversations (member_low, member_high) where kind = 'team';

-- Are these two people in the same sponsor line (one is above the other)?
create or replace function public.in_same_line(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select a <> b and exists (select 1 from team_relationships
    where depth >= 1 and ((ancestor_id = a and descendant_id = b) or (ancestor_id = b and descendant_id = a)))
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
            else in_same_line(c.member_low, c.member_high) end
      and not exists (select 1 from user_blocks b join conversation_members x on x.conversation_id = c.id and x.user_id = b.blocked_id
                      join conversation_members y on y.conversation_id = c.id and y.user_id = b.blocker_id
                      where x.user_id <> y.user_id))
$$;

create or replace function public.open_team_chat(p_other uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; lo uuid := least(auth.uid(), p_other); hi uuid := greatest(auth.uid(), p_other);
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not in_same_line(auth.uid(), p_other) then
    raise exception 'You can chat privately with people in your sponsor line (above or below you).';
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

create or replace function public.my_chats()
returns table (id uuid, other_id uuid, full_name text, avatar_url text, last_message_at timestamptz, unread integer, can_send boolean, last_seen timestamptz, kind text)
language sql stable security definer set search_path = public as $$
  select c.id, o.user_id, pr.full_name, pr.avatar_url, c.last_message_at,
         (select count(*)::int from messages m where m.conversation_id = c.id and m.sender_id <> auth.uid()
            and m.created_at > coalesce(me.last_read_at, '-infinity')),
         can_send_in(c.id), o.last_read_at, c.kind
  from conversation_members me
  join conversations c on c.id = me.conversation_id
  join conversation_members o on o.conversation_id = c.id and o.user_id <> me.user_id
  join profiles pr on pr.id = o.user_id
  where me.user_id = auth.uid()
  order by c.last_message_at desc nulls last
$$;

-- Notification links straight to the conversation.
create or replace function public.messages_after_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_other uuid; v_name text; v_muted boolean;
begin
  update conversations set last_message_at = new.created_at where id = new.conversation_id;
  update conversation_members set last_read_at = new.created_at where conversation_id = new.conversation_id and user_id = new.sender_id;
  select user_id, muted into v_other, v_muted from conversation_members where conversation_id = new.conversation_id and user_id <> new.sender_id;
  if v_other is null or v_muted then return new; end if;
  if exists (select 1 from notifications where user_id = v_other and type = 'chat_message' and read_at is null
             and data->>'conversation_id' = new.conversation_id::text and created_at > now() - interval '30 minutes') then
    return new;
  end if;
  select full_name into v_name from profiles where id = new.sender_id;
  perform notify(v_other, 'chat_message', 'New message from ' || v_name,
    case new.kind when 'text' then left(new.body, 100) when 'voice' then 'Voice note' when 'image' then 'Photo'
                  when 'file' then 'File' when 'goal' then 'Shared a goal' when 'focus_invite' then 'Invited you to focus together' else left(new.body, 100) end,
    '/messages?c=' || new.conversation_id, jsonb_build_object('conversation_id', new.conversation_id));
  return new;
end $$;

revoke execute on function public.in_same_line(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.open_team_chat(uuid) from public, anon;
revoke execute on function public.my_chats() from public, anon;
grant execute on function public.my_chats() to authenticated;
grant execute on function public.open_team_chat(uuid) to authenticated;
