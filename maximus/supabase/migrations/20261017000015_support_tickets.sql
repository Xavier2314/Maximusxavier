-- =============================================================================
-- MAXIMUS — 0015 Help & complaints (from the chat widget or the Help page)
-- =============================================================================

create table public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  category    text not null default 'other' check (category in ('payment', 'attendance', 'team', 'app_problem', 'conduct', 'other')),
  message     text not null check (length(trim(message)) between 5 and 4000),
  page        text check (length(page) <= 200),
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_note  text check (length(admin_note) <= 2000),
  handled_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index support_tickets_status_idx on public.support_tickets (status, created_at desc);
create index support_tickets_user_idx on public.support_tickets (user_id, created_at desc);
create trigger support_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;
create policy support_tickets_read on public.support_tickets for select to authenticated
  using (user_id = auth.uid() or public.has_permission('view_org_analytics'));
create policy support_tickets_insert on public.support_tickets for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and admin_note is null and handled_by is null);
create policy support_tickets_admin_update on public.support_tickets for update to authenticated
  using (public.has_permission('view_org_analytics')) with check (public.has_permission('view_org_analytics'));

-- Admins hear about new complaints; members hear back when the status changes.
create or replace function public.support_tickets_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_name text;
begin
  if tg_op = 'INSERT' then
    select full_name into v_name from profiles where id = new.user_id;
    for r in select distinct ur.user_id from user_roles ur join roles ro on ro.id = ur.role_id
             where ro.key in ('super_admin', 'executive_admin') and ur.user_id <> new.user_id loop
      perform notify(r.user_id, 'support_ticket', 'New complaint from ' || v_name,
                     left(new.message, 140), '/admin/support', jsonb_build_object('ticket_id', new.id));
    end loop;
  elsif new.status <> old.status or coalesce(new.admin_note, '') <> coalesce(old.admin_note, '') then
    perform notify(new.user_id, 'support_ticket',
      case new.status when 'resolved' then 'Your complaint was resolved' when 'in_progress' then 'Your complaint is being handled' else 'Update on your complaint' end,
      coalesce(new.admin_note, left(new.message, 120)), '/support', jsonb_build_object('ticket_id', new.id));
  end if;
  return new;
end $$;
create trigger support_tickets_notify after insert or update on public.support_tickets
  for each row execute function public.support_tickets_notify();
