-- =============================================================================
-- MAXIMUS — 0053 Forms and surveys
-- Members build forms and surveys, publish them at /s/<slug>, and read the responses.
-- Public pages and submissions run on the server (service role); only the owner reads responses.
-- =============================================================================

create table public.forms (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  slug       text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  kind       text not null default 'form' check (kind in ('form', 'survey')),
  published  boolean not null default false,
  definition jsonb not null default '{}'::jsonb check (jsonb_typeof(definition) = 'object' and pg_column_size(definition) <= 120000),
  views      integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index forms_user_idx on public.forms (user_id, created_at);
create trigger forms_updated_at before update on public.forms for each row execute function public.set_updated_at();

alter table public.forms enable row level security;
create policy forms_own_read   on public.forms for select to authenticated using (user_id = auth.uid());
create policy forms_own_insert on public.forms for insert to authenticated with check (user_id = auth.uid());
create policy forms_own_update on public.forms for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy forms_own_delete on public.forms for delete to authenticated using (user_id = auth.uid());
revoke all on public.forms from anon;
revoke update on public.forms from authenticated;
grant update (title, slug, published, definition) on public.forms to authenticated;

create table public.form_responses (
  id         uuid primary key default gen_random_uuid(),
  form_id    uuid not null references public.forms (id) on delete cascade,
  answers    jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) <= 30000),
  name       text check (char_length(name) <= 200),
  email      text check (char_length(email) <= 254),
  phone      text check (char_length(phone) <= 60),
  created_at timestamptz not null default now()
);
create index form_responses_form_idx on public.form_responses (form_id, created_at desc);

alter table public.form_responses enable row level security;
-- Visitors never insert directly: the server inserts after checking the answers against the published form.
create policy form_responses_owner_read   on public.form_responses for select to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.user_id = auth.uid()));
create policy form_responses_owner_delete on public.form_responses for delete to authenticated
  using (exists (select 1 from public.forms f where f.id = form_id and f.user_id = auth.uid()));
revoke all on public.form_responses from anon;
revoke insert, update on public.form_responses from authenticated;

-- A member can keep up to 25 forms.
create or replace function public.forms_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from forms where user_id = new.user_id) >= 25 then
    raise exception 'You can have up to 25 forms and surveys. Delete one to add another.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger forms_limit_trg before insert on public.forms for each row execute function public.forms_limit();

create or replace function public.suggest_form_slug(p_hint text)
returns text language plpgsql stable security definer set search_path = public as $$
declare base text; v text; n int := 1;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  base := trim(both '-' from regexp_replace(lower(coalesce(p_hint, '')), '[^a-z0-9]+', '-', 'g'));
  base := left(coalesce(nullif(base, ''), 'form'), 34);
  if length(base) < 3 then base := base || '-form'; end if;
  v := base;
  while exists (select 1 from forms where slug = v) loop n := n + 1; v := base || '-' || n; end loop;
  return v;
end $$;
revoke execute on function public.suggest_form_slug(text) from public, anon;
grant execute on function public.suggest_form_slug(text) to authenticated;

create or replace function public.form_viewed(p_slug text)
returns void language sql security definer set search_path = public as $$
  update forms set views = views + 1 where slug = p_slug and published
$$;
revoke execute on function public.form_viewed(text) from public, anon, authenticated;
grant execute on function public.form_viewed(text) to service_role;
