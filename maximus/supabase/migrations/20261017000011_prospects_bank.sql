-- =============================================================================
-- MAXIMUS — 0011 Prospects pipeline, AI follow-up, connected accounts, Bank waitlist
-- =============================================================================

create type public.prospect_stage as enum
  ('new', 'contacted', 'interested', 'presentation', 'follow_up', 'joined', 'customer', 'not_now');
create type public.prospect_channel as enum ('whatsapp', 'email', 'manual');

create table public.prospects (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  full_name         text not null check (length(trim(full_name)) between 2 and 120),
  -- Digits only, international format without "+" (e.g. 2348012345678).
  phone             text check (phone ~ '^[0-9]{7,15}$'),
  email             text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  source            text check (length(source) <= 120),
  stage             public.prospect_stage not null default 'new',
  channel           public.prospect_channel not null default 'manual',
  -- What the AI should know: interests, situation, how you met.
  notes             text check (length(notes) <= 4000),
  autopilot         boolean not null default false,
  opted_out         boolean not null default false,
  email_thread_id   text,
  next_follow_up_at timestamptz,
  last_contacted_at timestamptz,
  last_reply_at     timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index prospects_owner_stage_idx on public.prospects (owner_id, stage);
create index prospects_phone_idx on public.prospects (phone) where phone is not null;
create index prospects_due_idx on public.prospects (next_follow_up_at) where autopilot and not opted_out;
create trigger prospects_updated_at before update on public.prospects
  for each row execute function public.set_updated_at();

create table public.prospect_messages (
  id             uuid primary key default gen_random_uuid(),
  prospect_id    uuid not null references public.prospects (id) on delete cascade,
  owner_id       uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  direction      text not null check (direction in ('out', 'in')),
  channel        public.prospect_channel not null default 'manual',
  body           text not null check (length(trim(body)) between 1 and 4000),
  -- draft: suggested, not sent · sent: delivered by the platform · logged: member sent it themselves
  status         text not null default 'logged' check (status in ('draft', 'sent', 'failed', 'received', 'logged')),
  ai_generated   boolean not null default false,
  attachment_url text check (attachment_url ~ '^https://'),
  external_id    text,
  error          text,
  created_at     timestamptz not null default now()
);
create index prospect_messages_prospect_idx on public.prospect_messages (prospect_id, created_at);
create unique index prospect_messages_external_idx on public.prospect_messages (external_id) where external_id is not null;

alter table public.prospects enable row level security;
alter table public.prospect_messages enable row level security;

-- Members own their prospects; leaders who can see a member's team data can
-- read (not change) them, so they can coach follow-ups.
create policy prospects_read on public.prospects for select to authenticated
  using (owner_id = auth.uid() or public.can_view_team_data(owner_id));
create policy prospects_insert on public.prospects for insert to authenticated
  with check (owner_id = auth.uid());
create policy prospects_update on public.prospects for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy prospects_delete on public.prospects for delete to authenticated
  using (owner_id = auth.uid());

create policy prospect_messages_read on public.prospect_messages for select to authenticated
  using (owner_id = auth.uid() or public.can_view_team_data(owner_id));
create policy prospect_messages_insert on public.prospect_messages for insert to authenticated
  with check (owner_id = auth.uid()
              and exists (select 1 from public.prospects p where p.id = prospect_id and p.owner_id = auth.uid()));
create policy prospect_messages_update on public.prospect_messages for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy prospect_messages_delete on public.prospect_messages for delete to authenticated
  using (owner_id = auth.uid() and status = 'draft');

-- Pipeline counts for a member (self, or a member whose team data you can see).
create or replace function public.prospect_pipeline(p_user uuid default null)
returns table (stage public.prospect_stage, total integer)
language plpgsql stable security definer set search_path = public as $$
declare v_user uuid := coalesce(p_user, auth.uid());
begin
  if not can_view_team_data(v_user) then
    raise exception 'You are not authorised to view this pipeline' using errcode = '42501';
  end if;
  return query select p.stage, count(*)::int from prospects p where p.owner_id = v_user group by p.stage;
end $$;
revoke execute on function public.prospect_pipeline(uuid) from public, anon;
grant execute on function public.prospect_pipeline(uuid) to authenticated, service_role;

-- -----------------------------------------------------------------------------
-- Connected accounts (Gmail, Spotify). Tokens are secrets: no member-facing
-- policies at all, so only the server (service role) can read them.
-- -----------------------------------------------------------------------------
create table public.member_integrations (
  user_id       uuid not null references public.profiles (id) on delete cascade,
  provider      text not null check (provider in ('google', 'spotify')),
  account_email text,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz,
  scopes        text,
  connected_at  timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.member_integrations enable row level security;
revoke all on public.member_integrations from anon, authenticated;

create or replace function public.my_integrations()
returns table (provider text, account_email text, connected_at timestamptz)
language sql stable security definer set search_path = public as $$
  select provider, account_email, connected_at from member_integrations where user_id = auth.uid()
$$;
create or replace function public.disconnect_integration(p_provider text)
returns void language sql security definer set search_path = public as $$
  delete from member_integrations where user_id = auth.uid() and provider = p_provider
$$;
revoke execute on function public.my_integrations() from public, anon;
revoke execute on function public.disconnect_integration(text) from public, anon;
grant execute on function public.my_integrations() to authenticated;
grant execute on function public.disconnect_integration(text) to authenticated;

-- -----------------------------------------------------------------------------
-- Maximus Bank (coming soon): waitlist only. No money is held by the platform.
-- -----------------------------------------------------------------------------
create table public.bank_waitlist (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  interests  text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.bank_waitlist enable row level security;
create policy bank_waitlist_own on public.bank_waitlist for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.bank_waitlist_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int from bank_waitlist
$$;
revoke execute on function public.bank_waitlist_count() from public, anon;
grant execute on function public.bank_waitlist_count() to authenticated;
