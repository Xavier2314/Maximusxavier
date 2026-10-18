-- =============================================================================
-- MAXIMUS — 0034 Online payments (Flutterwave)
-- A member starts a payment (white-label fee, savings or contributions); the
-- app sends them to Flutterwave's payment page. A payment is applied only after
-- the server has re-checked it with Flutterwave (webhook or return page), via
-- apply_online_payment(), which members cannot call. Applying is idempotent.
-- =============================================================================

alter type public.transaction_source add value if not exists 'online_payment';

create table public.online_payments (
  id          uuid primary key default gen_random_uuid(),
  tx_ref      text not null unique check (tx_ref ~ '^MX-[A-Za-z0-9-]{8,60}$'),
  user_id     uuid not null references public.profiles (id) on delete restrict,
  purpose     text not null check (purpose in ('white_label', 'savings', 'contributions')),
  office_id   uuid references public.offices (id) on delete set null,
  amount      numeric(14, 2) not null check (amount >= 100 and amount <= 5000000),
  currency    text not null default 'NGN' check (currency = 'NGN'),
  status      text not null default 'pending' check (status in ('pending', 'successful', 'failed', 'cancelled')),
  provider_id bigint,
  paid_amount numeric(14, 2),
  ledger_id   uuid references public.financial_transactions (id) on delete set null,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz,
  check (purpose <> 'white_label' or office_id is not null)
);
create index online_payments_user_idx on public.online_payments (user_id, created_at desc);

alter table public.online_payments enable row level security;
create policy online_payments_own on public.online_payments for select to authenticated using (user_id = auth.uid());
create policy online_payments_admin on public.online_payments for select to authenticated
  using (has_role('super_admin') or has_permission('approve_financial_transactions'));

-- Start a payment. Returns the reference to send to Flutterwave.
create or replace function public.create_online_payment(p_purpose text, p_amount numeric default null, p_office uuid default null)
returns table (tx_ref text, amount numeric)
language plpgsql security definer set search_path = public as $$
declare v_amount numeric; v_ref text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_purpose = 'white_label' then
    if p_office is null or not can_manage_office(p_office) then
      raise exception 'Only this office''s managers can pay its white-label fee' using errcode = '42501';
    end if;
    if (select white_label_paid from offices where id = p_office) then raise exception 'This office is already unlocked.'; end if;
    v_amount := coalesce((select (value->>'amount')::numeric from app_settings where key = 'white_label_fee'), 5000);
  elsif p_purpose in ('savings', 'contributions') then
    if p_amount is null or p_amount < 100 then raise exception 'The smallest online payment is ₦100.'; end if;
    if p_amount > 5000000 then raise exception 'For amounts above ₦5,000,000 please pay by bank transfer.'; end if;
    v_amount := round(p_amount, 2);
  else
    raise exception 'Unknown payment type';
  end if;
  if (select count(*) from online_payments where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Too many payment attempts. Please try again later.';
  end if;
  v_ref := 'MX-' || replace(gen_random_uuid()::text, '-', '');
  insert into online_payments (tx_ref, user_id, purpose, office_id, amount)
    values (v_ref, auth.uid(), p_purpose, case when p_purpose = 'white_label' then p_office end, v_amount);
  return query select v_ref, v_amount;
end $$;

-- Apply a payment the server has verified with Flutterwave. Safe to call twice.
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

revoke execute on function public.create_online_payment(text, numeric, uuid) from public, anon;
grant execute on function public.create_online_payment(text, numeric, uuid) to authenticated;
revoke execute on function public.apply_online_payment(text, bigint, numeric, text, boolean) from public, anon, authenticated;
grant execute on function public.apply_online_payment(text, bigint, numeric, text, boolean) to service_role;
