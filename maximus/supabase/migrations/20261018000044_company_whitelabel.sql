-- =============================================================================
-- MAXIMUS — 0044 Self-serve company white-label
-- A company opens the public /white-label link, creates its admin account and
-- pays. When Flutterwave confirms the payment, provision_company() creates the
-- company's branded office (no "Powered by"), makes the payer its office admin
-- and gives them a join link for their members.
-- =============================================================================

alter table public.online_payments drop constraint if exists online_payments_purpose_check;
alter table public.online_payments add constraint online_payments_purpose_check
  check (purpose in ('white_label', 'savings', 'contributions', 'upwork_analyser', 'company_whitelabel'));

create table public.company_signups (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  company_name  text not null check (length(trim(company_name)) between 2 and 60),
  primary_color text not null check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color  text not null check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  tx_ref        text not null unique,
  status        text not null default 'pending' check (status in ('pending', 'active')),
  office_id     uuid references public.offices (id) on delete set null,
  created_at    timestamptz not null default now()
);
alter table public.company_signups enable row level security;
create policy company_signups_read on public.company_signups for select to authenticated
  using (user_id = auth.uid() or has_role('super_admin'));

-- Called by the signed-in company admin before paying. Returns the payment reference.
create or replace function public.create_company_signup(p_company text, p_primary text, p_accent text)
returns table (tx_ref text, amount numeric)
language plpgsql security definer set search_path = public as $$
declare v_amount numeric; v_ref text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if length(trim(coalesce(p_company, ''))) < 2 then raise exception 'Enter your company name.'; end if;
  if exists (select 1 from offices where lower(name) = lower(trim(p_company))) then
    raise exception 'A company with that name already exists. Add your city or a short word to make it unique.';
  end if;
  if (select count(*) from online_payments where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many payment attempts. Please try again later.';
  end if;
  v_amount := coalesce((select (value->>'amount')::numeric from app_settings where key = 'company_whitelabel_fee'),
                       (select (value->>'amount')::numeric from app_settings where key = 'white_label_fee'), 5000);
  v_ref := 'MX-' || replace(gen_random_uuid()::text, '-', '');
  insert into online_payments (tx_ref, user_id, purpose, amount) values (v_ref, auth.uid(), 'company_whitelabel', v_amount);
  insert into company_signups (user_id, company_name, primary_color, accent_color, tx_ref)
    values (auth.uid(), trim(p_company), coalesce(p_primary, '#1d4ed8'), coalesce(p_accent, '#84cc16'), v_ref);
  return query select v_ref, v_amount;
end $$;
revoke execute on function public.create_company_signup(text, text, text) from public, anon;
grant execute on function public.create_company_signup(text, text, text) to authenticated;

-- Creates the company's branded office once its payment is confirmed. Safe to call twice.
create or replace function public.provision_company(p_tx_ref text)
returns uuid language plpgsql security definer set search_path = public as $$
declare s company_signups%rowtype; v_office uuid; v_name text;
begin
  select * into s from company_signups where tx_ref = p_tx_ref for update;
  if not found then return null; end if;
  if s.status = 'active' then return s.office_id; end if;
  v_name := s.company_name;
  if exists (select 1 from offices where lower(name) = lower(v_name)) then v_name := v_name || ' (' || substr(s.id::text, 1, 4) || ')'; end if;
  insert into offices (name, manager_id, display_name, primary_color, accent_color, white_label, white_label_paid)
    values (v_name, s.user_id, s.company_name, s.primary_color, s.accent_color, true, true)
    returning id into v_office;
  insert into office_memberships (office_id, user_id, is_manager) values (v_office, s.user_id, true) on conflict do nothing;
  update profiles set office_id = v_office where id = s.user_id;
  insert into user_roles (user_id, role_id) select s.user_id, id from roles where key = 'office_admin' on conflict do nothing;
  update company_signups set status = 'active', office_id = v_office where id = s.id;
  perform notify(s.user_id, 'white_label', s.company_name || ' is ready 🎉',
    'Your branded company app is live. Add your logo in Office view > Branding and share your join link.', '/office/brand', jsonb_build_object('office_id', v_office));
  perform write_audit('company_provisioned', 'office', v_office::text, jsonb_build_object('company', s.company_name, 'tx_ref', p_tx_ref));
  return v_office;
end $$;
revoke execute on function public.provision_company(text) from public, anon, authenticated;

-- Apply a verified payment (now also provisions self-serve companies).
create or replace function public.apply_online_payment(p_tx_ref text, p_provider_id bigint, p_paid numeric, p_currency text, p_successful boolean)
returns text language plpgsql security definer set search_path = public as $$
declare p online_payments%rowtype; v_acc uuid; v_ledger uuid;
begin
  select * into p from online_payments where tx_ref = p_tx_ref for update;
  if not found then return 'unknown'; end if;
  if p.status = 'successful' then return 'already'; end if;
  if not p_successful then
    update online_payments set status = 'failed', provider_id = coalesce(p_provider_id, provider_id) where id = p.id;
    return 'failed';
  end if;
  if upper(coalesce(p_currency, '')) <> p.currency or coalesce(p_paid, 0) < p.amount then
    update online_payments set status = 'failed', provider_id = p_provider_id, paid_amount = p_paid where id = p.id;
    perform write_audit('online_payment_mismatch', 'online_payment', p.id::text,
      jsonb_build_object('expected', p.amount, 'paid', p_paid, 'currency', p_currency));
    return 'mismatch';
  end if;

  if p.purpose = 'white_label' then
    update offices set white_label_paid = true where id = p.office_id;
    perform notify(p.user_id, 'white_label', 'White-label unlocked',
      'Payment received. You can now remove "Powered by" in Office view > Branding.', '/office/brand', jsonb_build_object('tx_ref', p.tx_ref));
  elsif p.purpose = 'company_whitelabel' then
    perform provision_company(p.tx_ref);
  elsif p.purpose = 'upwork_analyser' then
    insert into tool_access (user_id, tool, tx_ref) values (p.user_id, 'upwork_analyser', p.tx_ref) on conflict do nothing;
    perform notify(p.user_id, 'payment_confirmed', 'Upwork Account Analyser unlocked',
      'Payment received. Analyse your Upwork profile now.', '/tools/upwork', jsonb_build_object('tx_ref', p.tx_ref));
  else
    select id into v_acc from financial_accounts where user_id = p.user_id and kind = p.purpose::financial_account_kind;
    if v_acc is null then
      insert into financial_accounts (user_id, kind, name) values (p.user_id, p.purpose::financial_account_kind, initcap(p.purpose)) returning id into v_acc;
    end if;
    insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source, note, created_by)
      values (v_acc, p.user_id, case when p.purpose = 'savings' then 'deposit' else 'contribution' end::transaction_kind, 1, p.amount,
              'confirmed', 'online_payment', 'Paid online with Flutterwave (' || p.tx_ref || ')', p.user_id)
      returning id into v_ledger;
    perform notify(p.user_id, 'payment_confirmed', 'Payment received',
      '₦' || to_char(p.amount, 'FM999,999,990.00') || ' added to your ' || p.purpose || '.', '/finance', jsonb_build_object('tx_ref', p.tx_ref));
  end if;
  update online_payments set status = 'successful', provider_id = p_provider_id, paid_amount = p_paid, paid_at = now(), ledger_id = v_ledger where id = p.id;
  perform write_audit('online_payment_applied', 'online_payment', p.id::text,
    jsonb_build_object('purpose', p.purpose, 'amount', p.amount, 'provider_id', p_provider_id));
  return 'applied';
end $$;
