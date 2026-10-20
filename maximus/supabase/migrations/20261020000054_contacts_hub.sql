-- =============================================================================
-- MAXIMUS — 0054 Contacts hub
-- Prospects become the member's one contact list: tags, custom fields, and an activity timeline.
-- Funnel leads, orders and form responses are added to it automatically (server side).
-- =============================================================================

alter table public.prospects
  add column if not exists tags text[] not null default '{}' check (cardinality(tags) <= 20),
  add column if not exists custom jsonb not null default '{}'::jsonb check (jsonb_typeof(custom) = 'object' and pg_column_size(custom) <= 8000);
create index if not exists prospects_tags_idx on public.prospects using gin (tags);

create table public.contact_events (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.prospects (id) on delete cascade,
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  kind       text not null check (kind in ('funnel_lead', 'funnel_order', 'form_response', 'imported', 'note')),
  title      text not null check (char_length(title) between 1 and 200),
  detail     jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object' and pg_column_size(detail) <= 6000),
  created_at timestamptz not null default now()
);
create index contact_events_contact_idx on public.contact_events (contact_id, created_at desc);

alter table public.contact_events enable row level security;
-- Members and the leaders who may coach them can read; only the owner can remove. Events are written by the server.
create policy contact_events_read on public.contact_events for select to authenticated
  using (owner_id = auth.uid() or public.can_view_team_data(owner_id));
create policy contact_events_delete on public.contact_events for delete to authenticated using (owner_id = auth.uid());
revoke all on public.contact_events from anon;
revoke insert, update on public.contact_events from authenticated;

-- Adds a person to a member's contacts, or updates the one already there (matched by phone or email).
-- Called by the server only, after it has checked the submission.
create or replace function public.upsert_contact(
  p_owner uuid, p_name text, p_phone text, p_email text, p_source text, p_stage public.prospect_stage, p_tags text[]
) returns uuid
language plpgsql security definer set search_path = public as $$
declare cid uuid; cur public.prospect_stage; nm text;
begin
  nm := left(trim(coalesce(p_name, '')), 120);
  if length(nm) < 2 then nm := 'Unknown contact'; end if;
  select id, stage into cid, cur from prospects
   where owner_id = p_owner
     and ((p_phone is not null and phone = p_phone) or (p_email is not null and lower(email) = lower(p_email)))
   order by created_at limit 1;
  if cid is null then
    insert into prospects (owner_id, full_name, phone, email, source, stage, channel, tags)
    values (p_owner, nm, p_phone, p_email, left(p_source, 120), coalesce(p_stage, 'new'),
            case when p_phone is not null then 'whatsapp'::prospect_channel when p_email is not null then 'email'::prospect_channel else 'manual'::prospect_channel end,
            coalesce((select array(select distinct t from unnest(p_tags) t limit 20)), '{}'))
    returning id into cid;
  else
    update prospects set
      phone = coalesce(phone, p_phone), email = coalesce(email, p_email),
      stage = case when p_stage = 'customer' and cur not in ('joined', 'customer') then 'customer'::prospect_stage else cur end,
      tags = (select array(select distinct t from unnest(tags || coalesce(p_tags, '{}')) t limit 20))
     where id = cid;
  end if;
  return cid;
end $$;
revoke execute on function public.upsert_contact(uuid, text, text, text, text, public.prospect_stage, text[]) from public, anon, authenticated;
grant execute on function public.upsert_contact(uuid, text, text, text, text, public.prospect_stage, text[]) to service_role;

-- Tag counts for a member's contacts (for the filter bar).
create or replace function public.contact_tag_counts(p_user uuid default null)
returns table (tag text, total integer)
language sql stable security definer set search_path = public as $$
  select t, count(*)::int from prospects p, unnest(p.tags) t
   where p.owner_id = coalesce(p_user, auth.uid()) and (p.owner_id = auth.uid() or public.can_view_team_data(p.owner_id))
   group by t order by count(*) desc, t limit 50
$$;
revoke execute on function public.contact_tag_counts(uuid) from public, anon;
grant execute on function public.contact_tag_counts(uuid) to authenticated;
