-- =============================================================================
-- MAXIMUS — 0049 Funnel builder
-- Members design sales funnels (pages made of blocks) and publish them at
-- /f/<slug>. Visitors send leads and product orders; only the funnel's owner
-- reads them. Public pages and lead capture run on the server (service role).
-- =============================================================================

create table public.funnels (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 80),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  published  boolean not null default false,
  product    jsonb not null default '{}'::jsonb check (jsonb_typeof(product) = 'object'),
  theme      jsonb not null default '{}'::jsonb check (jsonb_typeof(theme) = 'object'),
  pages      jsonb not null default '[]'::jsonb check (jsonb_typeof(pages) = 'array' and jsonb_array_length(pages) <= 6),
  views      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funnels_user_idx on public.funnels (user_id, created_at);
create trigger funnels_updated_at before update on public.funnels for each row execute function public.set_updated_at();

alter table public.funnels enable row level security;
create policy funnels_own_read   on public.funnels for select to authenticated using (user_id = auth.uid());
create policy funnels_own_insert on public.funnels for insert to authenticated with check (user_id = auth.uid());
create policy funnels_own_update on public.funnels for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy funnels_own_delete on public.funnels for delete to authenticated using (user_id = auth.uid());
revoke update on public.funnels from authenticated;
grant update (title, slug, published, product, theme, pages) on public.funnels to authenticated;

-- A member can keep up to 10 funnels.
create or replace function public.funnels_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from funnels where user_id = new.user_id) >= 10 then
    raise exception 'You can have up to 10 funnels. Delete one to add another.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger funnels_limit_trg before insert on public.funnels for each row execute function public.funnels_limit();

create table public.funnel_leads (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references public.funnels (id) on delete cascade,
  kind       text not null default 'lead' check (kind in ('lead', 'order')),
  name       text check (char_length(name) <= 120),
  email      text check (char_length(email) <= 254),
  phone      text check (char_length(phone) <= 40),
  message    text check (char_length(message) <= 1000),
  quantity   integer check (quantity between 1 and 999),
  product    text check (char_length(product) <= 120),
  created_at timestamptz not null default now()
);
create index funnel_leads_funnel_idx on public.funnel_leads (funnel_id, created_at desc);

alter table public.funnel_leads enable row level security;
-- Rows are written by the server (service role). The owner can read and delete their own.
create policy funnel_leads_owner_read on public.funnel_leads for select to authenticated
  using (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));
create policy funnel_leads_owner_delete on public.funnel_leads for delete to authenticated
  using (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));

-- A free, URL-safe link name for a new funnel.
create or replace function public.suggest_funnel_slug(p_hint text)
returns text language plpgsql stable security definer set search_path = public as $$
declare base text; v text; n int := 1;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  base := trim(both '-' from regexp_replace(lower(coalesce(p_hint, '')), '[^a-z0-9]+', '-', 'g'));
  base := left(coalesce(nullif(base, ''), 'funnel'), 34);
  if length(base) < 3 then base := base || '-offer'; end if;
  v := base;
  while exists (select 1 from funnels where slug = v) loop n := n + 1; v := base || '-' || n; end loop;
  return v;
end $$;
revoke execute on function public.suggest_funnel_slug(text) from public, anon;
grant execute on function public.suggest_funnel_slug(text) to authenticated;

create or replace function public.funnel_viewed(p_slug text)
returns void language sql security definer set search_path = public as $$
  update funnels set views = views + 1 where slug = p_slug and published
$$;
revoke execute on function public.funnel_viewed(text) from public, anon, authenticated;
grant execute on function public.funnel_viewed(text) to service_role;
