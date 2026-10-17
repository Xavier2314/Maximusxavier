-- =============================================================================
-- MAXIMUS — 0003 Notifications
-- In-app notifications are rows in `notifications`. Web push delivery is done by
-- the Next.js server (/api/push/dispatch), which reads rows whose push_status is
-- 'pending', applies preferences and quiet hours, and records the outcome.
-- =============================================================================

create table public.notification_preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  push_enabled   boolean not null default true,
  email_enabled  boolean not null default false,
  -- Notification types the member has switched off (see lib/notifications/types.ts).
  muted_types    text[] not null default '{}',
  quiet_start    time default '22:00',
  quiet_end      time default '07:00',
  updated_at     timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create type public.push_status as enum ('pending', 'sent', 'skipped', 'deferred', 'failed');

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text,
  link          text,
  data          jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  push_status   public.push_status not null default 'pending',
  push_after    timestamptz,
  push_attempts smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_push_queue_idx on public.notifications (created_at) where push_status in ('pending', 'deferred');

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Internal helper used by triggers and server functions to create a notification.
-- Respects muted types. Not callable directly by app users.
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text default null,
  p_link text default null, p_data jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from notification_preferences where user_id = p_user and p_type = any (muted_types)) then
    return null;
  end if;
  insert into notifications (user_id, type, title, body, link, data)
  values (p_user, p_type, p_title, p_body, p_link, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.notify(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer language sql security definer set search_path = public as $$
  with u as (
    update public.notifications set read_at = now()
    where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids))
    returning 1
  ) select count(*)::int from u
$$;

-- Every new profile gets default preferences.
create or replace function public.profiles_default_preferences() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger profiles_default_preferences after insert on public.profiles
  for each row execute function public.profiles_default_preferences();

-- Tell the sponsor when someone joins their team.
create or replace function public.profiles_notify_sponsor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sponsor_id is not null then
    perform notify(new.sponsor_id, 'team_registration', 'New team member',
                   new.full_name || ' just joined your team.', '/team',
                   jsonb_build_object('member_id', new.id));
  end if;
  return new;
end $$;
create trigger profiles_notify_sponsor after insert on public.profiles
  for each row execute function public.profiles_notify_sponsor();

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
-- Members mark items read via mark_notifications_read(); no direct writes.
revoke insert, update, delete on public.notifications from authenticated, anon;

create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
