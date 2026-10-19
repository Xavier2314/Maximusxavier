-- =============================================================================
-- MAXIMUS — 0050 Funnel versions and a separate published copy
-- * funnels.live holds the PUBLISHED snapshot. Visitors see it; edits and autosave only touch the draft
--   columns until the owner presses Publish. Rollback re-publishes an older snapshot.
-- * funnel_versions keeps history (auto, manual, publish, restore) per funnel, newest 50 kept.
-- =============================================================================

alter table public.funnels
  add column if not exists live jsonb check (live is null or jsonb_typeof(live) = 'object'),
  add column if not exists live_at timestamptz;
grant update (live, live_at) on public.funnels to authenticated;

-- Funnels that were already published keep looking exactly the same: their current content becomes the live snapshot.
update public.funnels
   set live = jsonb_build_object('title', title, 'theme', theme, 'product', product, 'pages', pages), live_at = updated_at
 where published and live is null;

create table public.funnel_versions (
  id         uuid primary key default gen_random_uuid(),
  funnel_id  uuid not null references public.funnels (id) on delete cascade,
  kind       text not null default 'manual' check (kind in ('auto', 'manual', 'publish', 'restore')),
  label      text check (char_length(label) <= 80),
  snapshot   jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index funnel_versions_funnel_idx on public.funnel_versions (funnel_id, created_at desc);

alter table public.funnel_versions enable row level security;
create policy funnel_versions_owner_read on public.funnel_versions for select to authenticated
  using (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));
create policy funnel_versions_owner_insert on public.funnel_versions for insert to authenticated
  with check (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));
create policy funnel_versions_owner_delete on public.funnel_versions for delete to authenticated
  using (exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));
-- Versions are immutable: there is no update policy and no update grant.
revoke update on public.funnel_versions from authenticated;

-- Keep the newest 50 versions per funnel.
create or replace function public.funnel_versions_trim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from funnel_versions where funnel_id = new.funnel_id and id in (
    select id from funnel_versions where funnel_id = new.funnel_id order by created_at desc offset 50);
  return null;
end $$;
create trigger funnel_versions_trim_trg after insert on public.funnel_versions for each row execute function public.funnel_versions_trim();
