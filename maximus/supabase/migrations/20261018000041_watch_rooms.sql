-- =============================================================================
-- MAXIMUS — 0041 Watch rooms
-- A member shares a link to a page where anyone (signed in or not) can watch a
-- YouTube video, optionally in sync with the host. The public page reads rooms
-- on the server; members manage only their own rooms.
-- =============================================================================

create table public.watch_rooms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  title       text not null check (length(trim(title)) between 2 and 120),
  description text check (length(description) <= 1000),
  youtube_id  text not null check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  live_sync   boolean not null default true,
  created_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  views       integer not null default 0,
  created_at  timestamptz not null default now()
);
create index watch_rooms_owner_idx on public.watch_rooms (created_by, created_at desc);

alter table public.watch_rooms enable row level security;
create policy watch_rooms_own_read on public.watch_rooms for select to authenticated using (created_by = auth.uid());
create policy watch_rooms_own_insert on public.watch_rooms for insert to authenticated
  with check (created_by = auth.uid() and (select count(*) from public.watch_rooms w where w.created_by = auth.uid()) < 100);
create policy watch_rooms_own_update on public.watch_rooms for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy watch_rooms_own_delete on public.watch_rooms for delete to authenticated using (created_by = auth.uid());
grant select, insert, delete on public.watch_rooms to authenticated;
revoke update on public.watch_rooms from authenticated;
grant update (title, description, youtube_id, live_sync) on public.watch_rooms to authenticated;

-- View counter, bumped by the server when a non-host opens the page.
create or replace function public.watch_room_viewed(p_slug text)
returns void language sql security definer set search_path = public as $$
  update watch_rooms set views = views + 1 where slug = p_slug
$$;
revoke execute on function public.watch_room_viewed(text) from public, anon, authenticated;
grant execute on function public.watch_room_viewed(text) to service_role;
