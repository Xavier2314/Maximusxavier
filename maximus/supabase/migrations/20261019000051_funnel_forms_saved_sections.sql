-- =============================================================================
-- MAXIMUS — 0051 Extra form answers on leads, and each member's reusable saved sections
-- =============================================================================

alter table public.funnel_leads
  add column if not exists data jsonb check (data is null or (jsonb_typeof(data) = 'object' and pg_column_size(data) <= 6000));

create table public.funnel_saved_sections (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name       text not null check (char_length(name) between 1 and 80),
  content    jsonb not null check (jsonb_typeof(content) = 'object' and pg_column_size(content) <= 100000),
  created_at timestamptz not null default now()
);
create index funnel_saved_sections_user_idx on public.funnel_saved_sections (user_id, created_at desc);

alter table public.funnel_saved_sections enable row level security;
create policy funnel_saved_sections_owner_read   on public.funnel_saved_sections for select to authenticated using (user_id = auth.uid());
create policy funnel_saved_sections_owner_insert on public.funnel_saved_sections for insert to authenticated with check (user_id = auth.uid());
create policy funnel_saved_sections_owner_delete on public.funnel_saved_sections for delete to authenticated using (user_id = auth.uid());
revoke all on public.funnel_saved_sections from anon;
revoke update on public.funnel_saved_sections from authenticated;

-- At most 60 saved sections per member.
create or replace function public.funnel_saved_sections_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from funnel_saved_sections where user_id = new.user_id) >= 60 then
    raise exception 'You can keep up to 60 saved sections. Delete one first.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger funnel_saved_sections_limit_trg before insert on public.funnel_saved_sections for each row execute function public.funnel_saved_sections_limit();
