-- =============================================================================
-- MAXIMUS — 0028 Weekly reflections & daily journal (private to the member)
-- =============================================================================
create table public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind        text not null check (kind in ('journal', 'reflection')),
  entry_date  date not null default current_date,
  mood        smallint check (mood between 1 and 5),
  wins        text check (length(wins) <= 2000),
  challenges  text check (length(challenges) <= 2000),
  lessons     text check (length(lessons) <= 2000),
  next_focus  text check (length(next_focus) <= 2000),
  body        text check (length(body) <= 6000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, kind, entry_date)
);
create trigger journal_entries_updated_at before update on public.journal_entries for each row execute function public.set_updated_at();
alter table public.journal_entries enable row level security;
create policy journal_entries_own on public.journal_entries for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
