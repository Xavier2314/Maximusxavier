-- =============================================================================
-- MAXIMUS — 0025 Business status & NeoLife ID
-- * Every member (Super Admins too) chooses their business status.
-- * NeoLife ID number lives in its own table: visible to the member, their
--   sponsor line and leaders (can_view_team_data looks only down the tree)
--   and admins, never to their downline.
-- =============================================================================

alter table public.profiles add column if not exists business_rank text check (business_rank in (
  'newbie', 'probie', 'distributor', 'manager', 'senior_manager', 'executive_manager', 'director',
  'emerald_director', 'sapphire_director',
  'ruby_director_1', 'ruby_director_2', 'ruby_director_3', 'ruby_director_4', 'ruby_director_5',
  'diamond_director_1', 'diamond_director_2', 'diamond_director_3', 'diamond_director_4', 'diamond_director_5'));
grant update (business_rank) on public.profiles to authenticated;

create table public.member_private (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  newlife_id text check (length(trim(newlife_id)) between 1 and 40),
  updated_at timestamptz not null default now()
);
create trigger member_private_updated_at before update on public.member_private
  for each row execute function public.set_updated_at();
alter table public.member_private enable row level security;
create policy member_private_read on public.member_private for select to authenticated
  using (public.can_view_team_data(user_id));
create policy member_private_insert on public.member_private for insert to authenticated
  with check (user_id = auth.uid());
create policy member_private_update on public.member_private for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Weekly report pre-fill now counts members by status too.
create or replace function public.office_rank_counts(p_office uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not can_manage_office(p_office) then
    raise exception 'You are not authorised to view this office' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_object_agg(r, n), '{}'::jsonb) from (
    select coalesce(p.business_rank, 'unset') as r, count(*) as n
    from office_memberships om join profiles p on p.id = om.user_id and p.status = 'active'
    where om.office_id = p_office group by 1) x);
end $$;
revoke execute on function public.office_rank_counts(uuid) from public, anon;
grant execute on function public.office_rank_counts(uuid) to authenticated;
