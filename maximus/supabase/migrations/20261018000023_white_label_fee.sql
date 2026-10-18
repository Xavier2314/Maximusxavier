-- =============================================================================
-- MAXIMUS — 0023 White-label fee
-- Removing "Powered by Maximus" is a paid, one-off unlock per office.
-- The office pays by bank transfer, uploads the receipt screenshot, an AI check
-- reads it (advisory only), and a Super Admin approves or rejects.
-- =============================================================================

insert into public.app_settings (key, value) values
  ('white_label_fee', jsonb_build_object(
     'amount', 5000, 'currency', 'NGN', 'bank', 'First Bank',
     'account_number', '3095342378', 'account_name', 'Aluele Valentine Emmanuel'))
on conflict (key) do nothing;

alter table public.offices add column if not exists white_label_paid boolean not null default false;
grant select (white_label_paid) on public.offices to authenticated;

create table public.white_label_requests (
  id            uuid primary key default gen_random_uuid(),
  office_id     uuid not null references public.offices (id) on delete cascade,
  requested_by  uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  amount        numeric(14, 2) not null check (amount > 0),
  receipt_path  text not null check (length(receipt_path) <= 300),
  reference     text check (length(reference) <= 120),
  ai_verdict    text check (ai_verdict in ('match', 'mismatch', 'unclear')),
  ai_notes      text check (length(ai_notes) <= 1500),
  ai_amount     numeric(14, 2),
  ai_account    text check (length(ai_account) <= 40),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id   uuid references public.profiles (id) on delete set null,
  review_note   text check (length(review_note) <= 500),
  reviewed_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index white_label_requests_status_idx on public.white_label_requests (status, created_at desc);
create unique index white_label_requests_one_pending on public.white_label_requests (office_id) where status = 'pending';

alter table public.white_label_requests enable row level security;
create policy wlr_read on public.white_label_requests for select to authenticated
  using (requested_by = auth.uid() or public.can_manage_office(office_id) or public.has_role('super_admin'));
create policy wlr_insert on public.white_label_requests for insert to authenticated
  with check (requested_by = auth.uid() and public.can_manage_office(office_id) and status = 'pending'
              and ai_verdict is null and reviewer_id is null
              and receipt_path like auth.uid()::text || '/%');
-- AI results are written by the server (service role); members can't edit requests.

create or replace function public.white_label_requests_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare r record; v_office text := (select coalesce(display_name, name) from offices where id = new.office_id);
begin
  for r in select distinct ur.user_id from user_roles ur join roles ro on ro.id = ur.role_id where ro.key = 'super_admin' loop
    perform notify(r.user_id, 'white_label', 'White-label payment to check',
      v_office || ' sent a receipt for ₦' || to_char(new.amount, 'FM999,999,990') || '.', '/admin/white-label',
      jsonb_build_object('request_id', new.id));
  end loop;
  return new;
end $$;
create trigger white_label_requests_notify after insert on public.white_label_requests
  for each row execute function public.white_label_requests_notify();

create or replace function public.decide_white_label(p_id uuid, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v white_label_requests%rowtype;
begin
  if not has_role('super_admin') then
    raise exception 'Only a Super Admin can approve white-label payments' using errcode = '42501';
  end if;
  select * into v from white_label_requests where id = p_id and status = 'pending' for update;
  if not found then raise exception 'This request was already handled'; end if;
  update white_label_requests set status = case when p_approve then 'approved' else 'rejected' end,
    reviewer_id = auth.uid(), review_note = nullif(trim(p_note), ''), reviewed_at = now() where id = p_id;
  if p_approve then update offices set white_label_paid = true where id = v.office_id; end if;
  perform notify(v.requested_by, 'white_label',
    case when p_approve then 'White-label unlocked' else 'White-label payment not confirmed' end,
    case when p_approve then 'You can now remove "Powered by" in Office view > Branding.'
         else coalesce(nullif(trim(p_note), ''), 'We couldn''t confirm the payment. Please check and send the receipt again.') end,
    '/office/brand', jsonb_build_object('request_id', p_id));
  perform write_audit(case when p_approve then 'white_label_approved' else 'white_label_rejected' end,
    'office', v.office_id::text, jsonb_build_object('request_id', p_id, 'note', p_note));
end $$;

-- White-label can only be switched on once paid (Super Admins may always).
create or replace function public.set_office_branding(
  p_office uuid, p_display_name text, p_tagline text, p_logo_url text,
  p_primary text, p_accent text, p_sidebar text, p_white_label boolean
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not can_manage_office(p_office) then
    raise exception 'Only this office''s managers can change its branding' using errcode = '42501';
  end if;
  if p_logo_url is not null and p_logo_url not like '%/storage/v1/object/public/branding/office/' || p_office::text || '/%' then
    raise exception 'Invalid logo';
  end if;
  if coalesce(p_white_label, false) and not has_role('super_admin')
     and not (select white_label_paid from offices where id = p_office) then
    raise exception 'Removing "Powered by" needs the one-off white-label fee first';
  end if;
  update offices set
    display_name  = nullif(trim(p_display_name), ''),
    tagline       = nullif(trim(p_tagline), ''),
    logo_url      = p_logo_url,
    primary_color = p_primary,
    accent_color  = p_accent,
    sidebar_color = p_sidebar,
    white_label   = coalesce(p_white_label, false)
  where id = p_office;
  perform write_audit('office_branding_changed', 'office', p_office::text,
    jsonb_build_object('primary', p_primary, 'accent', p_accent, 'sidebar', p_sidebar, 'white_label', p_white_label));
end $$;

revoke execute on function public.decide_white_label(uuid, boolean, text) from public, anon;
grant execute on function public.decide_white_label(uuid, boolean, text) to authenticated;
