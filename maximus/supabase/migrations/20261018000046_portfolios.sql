-- =============================================================================
-- MAXIMUS — 0046 Member portfolio websites
-- Each member can publish a one-page portfolio at /p/<slug>. Members edit only
-- their own; the public page reads published portfolios on the server.
-- =============================================================================

create table public.portfolios (
  user_id      uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  published    boolean not null default true,
  headline     text check (length(headline) <= 140),
  bio          text check (length(bio) <= 2000),
  skills       text[] not null default '{}' check (cardinality(skills) <= 30),
  services     jsonb not null default '[]'::jsonb check (jsonb_typeof(services) = 'array' and jsonb_array_length(services) <= 12),
  projects     jsonb not null default '[]'::jsonb check (jsonb_typeof(projects) = 'array' and jsonb_array_length(projects) <= 20),
  show_whatsapp boolean not null default true,
  show_email   boolean not null default false,
  accent       text check (accent ~ '^#[0-9a-fA-F]{6}$'),
  views        integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger portfolios_updated_at before update on public.portfolios for each row execute function public.set_updated_at();
alter table public.portfolios enable row level security;
create policy portfolios_own_read on public.portfolios for select to authenticated using (user_id = auth.uid());
create policy portfolios_own_insert on public.portfolios for insert to authenticated with check (user_id = auth.uid());
create policy portfolios_own_update on public.portfolios for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy portfolios_own_delete on public.portfolios for delete to authenticated using (user_id = auth.uid());
revoke update on public.portfolios from authenticated;
grant update (slug, published, headline, bio, skills, services, projects, show_whatsapp, show_email, accent) on public.portfolios to authenticated;

-- A free, URL-safe link name for a member's site, based on their name.
create or replace function public.suggest_portfolio_slug()
returns text language plpgsql stable security definer set search_path = public as $$
declare base text; v text; n int := 1;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select slug into v from portfolios where user_id = auth.uid();
  if v is not null then return v; end if;
  select trim(both '-' from regexp_replace(lower(full_name), '[^a-z0-9]+', '-', 'g')) into base from profiles where id = auth.uid();
  base := left(coalesce(nullif(base, ''), 'member'), 34);
  if length(base) < 3 then base := base || '-me'; end if;
  v := base;
  while exists (select 1 from portfolios where slug = v) loop n := n + 1; v := base || '-' || n; end loop;
  return v;
end $$;
revoke execute on function public.suggest_portfolio_slug() from public, anon;
grant execute on function public.suggest_portfolio_slug() to authenticated;

create or replace function public.portfolio_viewed(p_slug text)
returns void language sql security definer set search_path = public as $$
  update portfolios set views = views + 1 where slug = p_slug and published
$$;
revoke execute on function public.portfolio_viewed(text) from public, anon, authenticated;
grant execute on function public.portfolio_viewed(text) to service_role;
