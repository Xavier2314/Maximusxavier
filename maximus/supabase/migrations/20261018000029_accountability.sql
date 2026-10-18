-- =============================================================================
-- MAXIMUS — 0029 Accountability partners
-- Each member has a code (ACC-XXXXXX). A partnership starts only when the other
-- person accepts. Each side chooses what to share; partners can comment,
-- encourage, ask for an update or propose a deadline, but never edit the
-- other person's goals. Sponsors, uplines and admins get no access through this.
-- =============================================================================

create table public.accountability_codes (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  code       text not null unique check (code ~ '^ACC-[A-Z0-9]{6}$'),
  created_at timestamptz not null default now()
);

create table public.partnerships (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  partner_id   uuid not null references public.profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'active', 'declined', 'ended', 'cancelled')),
  message      text check (length(message) <= 300),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  ended_at     timestamptz,
  check (requester_id <> partner_id)
);
-- One open (pending or active) partnership per pair, and one active partner per member.
create unique index partnerships_pair_open on public.partnerships (least(requester_id, partner_id), greatest(requester_id, partner_id)) where status in ('pending', 'active');
create index partnerships_partner_idx on public.partnerships (partner_id, status);
create index partnerships_requester_idx on public.partnerships (requester_id, status);

-- What each member shares with their partner (one row per member per partnership).
create table public.partner_sharing (
  partnership_id uuid not null references public.partnerships (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  share_goals    boolean not null default true,
  share_habits   boolean not null default true,
  share_focus    boolean not null default true,
  share_score    boolean not null default false,
  checkin_morning time,
  checkin_evening time,
  primary key (partnership_id, user_id)
);

create table public.goal_comments (
  id                uuid primary key default gen_random_uuid(),
  goal_id           uuid not null references public.tool_goals (id) on delete cascade,
  author_id         uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind              text not null default 'comment' check (kind in ('comment', 'encourage', 'request_update', 'deadline')),
  body              text check (length(body) <= 1000),
  proposed_deadline date,
  proposal_status   text check (proposal_status in ('pending', 'accepted', 'declined')),
  created_at        timestamptz not null default now(),
  check (kind <> 'deadline' or proposed_deadline is not null)
);
create index goal_comments_goal_idx on public.goal_comments (goal_id, created_at);

create table public.partner_checkins (
  id             uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships (id) on delete cascade,
  user_id        uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  checkin_date   date not null default current_date,
  slot           text not null check (slot in ('morning', 'evening')),
  mood           smallint check (mood between 1 and 5),
  plan           text check (length(plan) <= 1000),
  done           text check (length(done) <= 1000),
  blockers       text check (length(blockers) <= 1000),
  created_at     timestamptz not null default now(),
  unique (partnership_id, user_id, checkin_date, slot)
);

-- The member's active partner (null if none).
create or replace function public.active_partner_of(p_user uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when requester_id = p_user then partner_id else requester_id end
  from partnerships where status = 'active' and p_user in (requester_id, partner_id) limit 1
$$;

-- Does p_owner share p_what with the signed-in member through an active partnership?
create or replace function public.partner_shares(p_owner uuid, p_what text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from partnerships p join partner_sharing s on s.partnership_id = p.id and s.user_id = p_owner
    where p.status = 'active'
      and ((p.requester_id = p_owner and p.partner_id = auth.uid()) or (p.partner_id = p_owner and p.requester_id = auth.uid()))
      and case p_what when 'goals' then s.share_goals when 'habits' then s.share_habits
                      when 'focus' then s.share_focus when 'score' then s.share_score else false end)
$$;

-- Partner read access (select only, never write) to what has been shared.
create policy tool_goals_partner_read on public.tool_goals for select to authenticated using (partner_shares(user_id, 'goals'));
create policy goal_updates_partner_read on public.goal_updates for select to authenticated using (partner_shares(user_id, 'goals'));
create policy habits_partner_read on public.habits for select to authenticated using (partner_shares(user_id, 'habits'));
create policy habit_checks_partner_read on public.habit_checks for select to authenticated using (partner_shares(user_id, 'habits'));
create policy focus_sessions_partner_read on public.focus_sessions for select to authenticated using (partner_shares(user_id, 'focus'));

alter table public.accountability_codes enable row level security;
create policy accountability_codes_own on public.accountability_codes for select to authenticated using (user_id = auth.uid());

alter table public.partnerships enable row level security;
create policy partnerships_parties on public.partnerships for select to authenticated using (auth.uid() in (requester_id, partner_id));

alter table public.partner_sharing enable row level security;
create policy partner_sharing_parties on public.partner_sharing for select to authenticated
  using (exists (select 1 from partnerships p where p.id = partnership_id and auth.uid() in (p.requester_id, p.partner_id)));
create policy partner_sharing_own_update on public.partner_sharing for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.goal_comments enable row level security;
-- Visible to the goal's owner and to a partner who can see the goal.
create policy goal_comments_read on public.goal_comments for select to authenticated using (
  exists (select 1 from tool_goals g where g.id = goal_id and (g.user_id = auth.uid() or partner_shares(g.user_id, 'goals'))));
create policy goal_comments_write on public.goal_comments for insert to authenticated with check (
  author_id = auth.uid()
  and exists (select 1 from tool_goals g where g.id = goal_id and (
        (g.user_id = auth.uid() and kind = 'comment')
        or (g.user_id <> auth.uid() and partner_shares(g.user_id, 'goals'))))
  and (kind <> 'deadline' or proposal_status = 'pending'));
create policy goal_comments_delete_own on public.goal_comments for delete to authenticated using (author_id = auth.uid());

alter table public.partner_checkins enable row level security;
create policy partner_checkins_read on public.partner_checkins for select to authenticated
  using (exists (select 1 from partnerships p where p.id = partnership_id and p.status = 'active' and auth.uid() in (p.requester_id, p.partner_id)));
create policy partner_checkins_write on public.partner_checkins for insert to authenticated with check (
  user_id = auth.uid()
  and exists (select 1 from partnerships p where p.id = partnership_id and p.status = 'active' and auth.uid() in (p.requester_id, p.partner_id)));
create policy partner_checkins_update_own on public.partner_checkins for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- The signed-in member's code, created on first use.
create or replace function public.my_accountability_code()
returns text language plpgsql security definer set search_path = public as $$
declare v text; alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select code into v from accountability_codes where user_id = auth.uid();
  if v is not null then return v; end if;
  loop
    v := 'ACC-' || (select string_agg(substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1), '') from generate_series(1, 6));
    begin
      insert into accountability_codes (user_id, code) values (auth.uid(), v);
      return v;
    exception when unique_violation then
      if exists (select 1 from accountability_codes where user_id = auth.uid()) then
        select code into v from accountability_codes where user_id = auth.uid();
        return v;
      end if;
    end;
  end loop;
end $$;

-- Ask someone to be your partner using their code.
create or replace function public.request_partner(p_code text, p_message text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_other uuid; v_id uuid; v_name text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select user_id into v_other from accountability_codes where code = upper(trim(p_code));
  if v_other is null then raise exception 'No member has that code. Check it and try again.'; end if;
  if v_other = auth.uid() then raise exception 'That is your own code.'; end if;
  if active_partner_of(auth.uid()) is not null then raise exception 'You already have a partner. End that partnership first.'; end if;
  if active_partner_of(v_other) is not null then raise exception 'This member already has an accountability partner.'; end if;
  if exists (select 1 from partnerships where status = 'pending' and least(requester_id, partner_id) = least(auth.uid(), v_other)
             and greatest(requester_id, partner_id) = greatest(auth.uid(), v_other)) then
    raise exception 'There is already a pending request between you two.';
  end if;
  if (select count(*) from partnerships where requester_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Too many requests today. Try again tomorrow.';
  end if;
  insert into partnerships (requester_id, partner_id, message) values (auth.uid(), v_other, left(p_message, 300)) returning id into v_id;
  select full_name into v_name from profiles where id = auth.uid();
  perform notify(v_other, 'partner_request', v_name || ' wants you as their accountability partner',
    coalesce(left(p_message, 140), 'Open Accountability to accept or decline.'), '/tools/accountability', jsonb_build_object('partnership_id', v_id));
  return v_id;
end $$;

-- Accept or decline (the invited member), or cancel (the requester).
create or replace function public.respond_partner(p_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare p partnerships%rowtype; v_name text;
begin
  select * into p from partnerships where id = p_id for update;
  if not found or p.status <> 'pending' then raise exception 'This request is no longer open.'; end if;
  if auth.uid() = p.requester_id and not p_accept then
    update partnerships set status = 'cancelled', responded_at = now() where id = p_id;
    return;
  end if;
  if auth.uid() <> p.partner_id then raise exception 'Not allowed' using errcode = '42501'; end if;
  if p_accept then
    if active_partner_of(p.partner_id) is not null or active_partner_of(p.requester_id) is not null then
      raise exception 'One of you already has an active partner.';
    end if;
    update partnerships set status = 'active', responded_at = now() where id = p_id;
    insert into partner_sharing (partnership_id, user_id) values (p_id, p.requester_id), (p_id, p.partner_id) on conflict do nothing;
    -- Other pending requests involving either member are closed.
    update partnerships set status = 'cancelled', responded_at = now()
      where status = 'pending' and id <> p_id
        and (requester_id in (p.requester_id, p.partner_id) or partner_id in (p.requester_id, p.partner_id));
  else
    update partnerships set status = 'declined', responded_at = now() where id = p_id;
  end if;
  select full_name into v_name from profiles where id = p.partner_id;
  perform notify(p.requester_id, 'partner_response',
    v_name || case when p_accept then ' accepted your partner request' else ' declined your partner request' end,
    null, '/tools/accountability', jsonb_build_object('partnership_id', p_id));
end $$;

create or replace function public.end_partnership(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p partnerships%rowtype; v_name text;
begin
  select * into p from partnerships where id = p_id for update;
  if not found or p.status <> 'active' or auth.uid() not in (p.requester_id, p.partner_id) then
    raise exception 'Partnership not found.';
  end if;
  update partnerships set status = 'ended', ended_at = now() where id = p_id;
  select full_name into v_name from profiles where id = auth.uid();
  perform notify(case when auth.uid() = p.requester_id then p.partner_id else p.requester_id end,
    'partner_ended', v_name || ' ended your accountability partnership', null, '/tools/accountability', '{}'::jsonb);
end $$;

-- Owner accepts or declines a deadline proposed by their partner. Only the owner changes their goal.
create or replace function public.respond_deadline(p_comment uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare c goal_comments%rowtype; g tool_goals%rowtype;
begin
  select * into c from goal_comments where id = p_comment for update;
  if not found or c.kind <> 'deadline' or c.proposal_status <> 'pending' then raise exception 'This proposal is no longer open.'; end if;
  select * into g from tool_goals where id = c.goal_id;
  if g.user_id <> auth.uid() then raise exception 'Only the goal owner can answer this.' using errcode = '42501'; end if;
  update goal_comments set proposal_status = case when p_accept then 'accepted' else 'declined' end where id = p_comment;
  if p_accept then
    update tool_goals set deadline = greatest(c.proposed_deadline, start_date) where id = g.id;
  end if;
  perform notify(c.author_id, 'partner_deadline',
    case when p_accept then 'Your deadline suggestion was accepted' else 'Your deadline suggestion was declined' end,
    g.title, '/tools/accountability', '{}'::jsonb);
end $$;

-- Tell the goal owner about a partner's comment/encouragement/request.
create or replace function public.goal_comments_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare g tool_goals%rowtype; v_name text;
begin
  select * into g from tool_goals where id = new.goal_id;
  if g.user_id = new.author_id then return new; end if;
  select full_name into v_name from profiles where id = new.author_id;
  perform notify(g.user_id, 'partner_' || new.kind,
    v_name || case new.kind when 'encourage' then ' cheered you on' when 'request_update' then ' asked for an update'
                            when 'deadline' then ' suggested a deadline' else ' commented' end || ': ' || g.title,
    left(new.body, 140), '/tools/goals', jsonb_build_object('goal_id', g.id));
  return new;
end $$;
create trigger goal_comments_notify after insert on public.goal_comments for each row execute function public.goal_comments_notify();

-- Check-ins reach the partner.
create or replace function public.partner_checkins_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare p partnerships%rowtype; v_name text;
begin
  select * into p from partnerships where id = new.partnership_id;
  select full_name into v_name from profiles where id = new.user_id;
  perform notify(case when new.user_id = p.requester_id then p.partner_id else p.requester_id end, 'partner_checkin',
    v_name || ' checked in (' || new.slot || ')', left(coalesce(new.plan, new.done), 140), '/tools/accountability', '{}'::jsonb);
  return new;
end $$;
create trigger partner_checkins_notify after insert on public.partner_checkins for each row execute function public.partner_checkins_notify();

-- Scheduled check-in reminders (called by the daily/hourly cron with the service role).
create or replace function public.run_checkin_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare r record; n int := 0; v_local timestamp; v_slot text;
begin
  for r in
    select s.*, pr.timezone from partner_sharing s
    join partnerships p on p.id = s.partnership_id and p.status = 'active'
    join profiles pr on pr.id = s.user_id
    where s.checkin_morning is not null or s.checkin_evening is not null
  loop
    v_local := now() at time zone coalesce(r.timezone, 'Africa/Lagos');
    v_slot := case
      when r.checkin_morning is not null and v_local::time >= r.checkin_morning and v_local::time < r.checkin_morning + interval '1 hour' then 'morning'
      when r.checkin_evening is not null and v_local::time >= r.checkin_evening and v_local::time < r.checkin_evening + interval '1 hour' then 'evening' end;
    continue when v_slot is null;
    continue when exists (select 1 from partner_checkins c where c.partnership_id = r.partnership_id and c.user_id = r.user_id
                          and c.checkin_date = v_local::date and c.slot = v_slot);
    continue when exists (select 1 from notifications nt where nt.user_id = r.user_id and nt.type = 'checkin_reminder'
                          and nt.created_at > now() - interval '3 hours' and nt.data->>'slot' = v_slot);
    perform notify(r.user_id, 'checkin_reminder', 'Time for your ' || v_slot || ' check-in',
      'Your accountability partner is waiting to hear from you.', '/tools/accountability', jsonb_build_object('slot', v_slot));
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.active_partner_of(uuid) from public, anon;
revoke execute on function public.partner_shares(uuid, text) from public, anon;
revoke execute on function public.run_checkin_reminders() from public, anon, authenticated;
revoke execute on function public.my_accountability_code() from public, anon;
revoke execute on function public.request_partner(text, text) from public, anon;
revoke execute on function public.respond_partner(uuid, boolean) from public, anon;
revoke execute on function public.end_partnership(uuid) from public, anon;
revoke execute on function public.respond_deadline(uuid, boolean) from public, anon;
revoke execute on function public.active_partner_of(uuid) from authenticated;
revoke update on public.partner_sharing from authenticated;
grant update (share_goals, share_habits, share_focus, share_score, checkin_morning, checkin_evening) on public.partner_sharing to authenticated;
grant execute on function public.partner_shares(uuid, text), public.my_accountability_code(),
  public.request_partner(text, text), public.respond_partner(uuid, boolean), public.end_partnership(uuid),
  public.respond_deadline(uuid, boolean) to authenticated;
