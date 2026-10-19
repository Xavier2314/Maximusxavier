-- =============================================================================
-- MAXIMUS — 0052 Ad plans: AI-drafted ad campaigns that send people to a member's funnel
-- A plan is a draft the member reviews and edits. Nothing here talks to Meta; it holds the plan only.
-- =============================================================================

create table public.funnel_ad_plans (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  funnel_id  uuid not null references public.funnels (id) on delete cascade,
  title      text not null check (char_length(title) between 1 and 120),
  plan       jsonb not null check (jsonb_typeof(plan) = 'object' and pg_column_size(plan) <= 80000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index funnel_ad_plans_funnel_idx on public.funnel_ad_plans (funnel_id, created_at desc);
create trigger funnel_ad_plans_updated_at before update on public.funnel_ad_plans for each row execute function public.set_updated_at();

alter table public.funnel_ad_plans enable row level security;
-- A plan can only be created for a funnel the member owns.
create policy funnel_ad_plans_owner_read   on public.funnel_ad_plans for select to authenticated using (user_id = auth.uid());
create policy funnel_ad_plans_owner_insert on public.funnel_ad_plans for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.funnels f where f.id = funnel_id and f.user_id = auth.uid()));
create policy funnel_ad_plans_owner_update on public.funnel_ad_plans for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy funnel_ad_plans_owner_delete on public.funnel_ad_plans for delete to authenticated using (user_id = auth.uid());
revoke all on public.funnel_ad_plans from anon;
revoke update on public.funnel_ad_plans from authenticated;
grant update (title, plan) on public.funnel_ad_plans to authenticated;

-- At most 15 ad plans per funnel.
create or replace function public.funnel_ad_plans_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from funnel_ad_plans where funnel_id = new.funnel_id) >= 15 then
    raise exception 'This funnel already has 15 ad plans. Delete one first.' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger funnel_ad_plans_limit_trg before insert on public.funnel_ad_plans for each row execute function public.funnel_ad_plans_limit();
