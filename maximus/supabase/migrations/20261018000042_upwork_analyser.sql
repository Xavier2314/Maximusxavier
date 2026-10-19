-- =============================================================================
-- MAXIMUS — 0042 Upwork Account Analyser (paid tool)
-- A one-time online payment unlocks the tool for that member. Access is
-- granted only by apply_online_payment() after Flutterwave confirms payment.
-- =============================================================================

alter table public.online_payments drop constraint if exists online_payments_purpose_check;
alter table public.online_payments add constraint online_payments_purpose_check
  check (purpose in ('white_label', 'savings', 'contributions', 'upwork_analyser'));

create table public.tool_access (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  tool       text not null check (tool in ('upwork_analyser')),
  tx_ref     text,
  granted_at timestamptz not null default now(),
  primary key (user_id, tool)
);
alter table public.tool_access enable row level security;
create policy tool_access_own on public.tool_access for select to authenticated
  using (user_id = auth.uid() or has_permission('approve_financial_transactions'));

create or replace function public.has_tool_access(p_tool text)
returns boolean language sql stable security definer set search_path = public as $$
  select has_role('super_admin') or exists (select 1 from tool_access where user_id = auth.uid() and tool = p_tool)
$$;
grant execute on function public.has_tool_access(text) to authenticated;

create table public.upwork_analyses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  input      jsonb not null,
  report     jsonb not null,
  score      integer check (score between 0 and 100),
  created_at timestamptz not null default now()
);
create index upwork_analyses_user_idx on public.upwork_analyses (user_id, created_at desc);
alter table public.upwork_analyses enable row level security;
create policy upwork_analyses_own on public.upwork_analyses for select to authenticated using (user_id = auth.uid());
create policy upwork_analyses_insert on public.upwork_analyses for insert to authenticated
  with check (user_id = auth.uid() and public.has_tool_access('upwork_analyser'));
create policy upwork_analyses_delete on public.upwork_analyses for delete to authenticated using (user_id = auth.uid());

-- Start a payment: now also for the analyser (price from app_settings, default ₦1,000).
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
  elsif p_purpose = 'upwork_analyser' then
    if has_tool_access('upwork_analyser') then raise exception 'You already have access to the Upwork Account Analyser.'; end if;
    v_amount := coalesce((select (value->>'amount')::numeric from app_settings where key = 'upwork_analyser_price'), 1000);
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

-- Apply a verified payment: the analyser purpose grants access instead of a ledger entry.
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

-- For members who paid outside the app (e.g. the Flutterwave payment-page link):
-- a Super Admin or earnings approver unlocks them by member ID.
create or replace function public.grant_tool_access(p_member_id text, p_tool text default 'upwork_analyser')
returns text language plpgsql security definer set search_path = public as $$
declare v_user uuid; v_name text;
begin
  if not (has_role('super_admin') or has_permission('approve_financial_transactions')) then
    raise exception 'Only payment approvers can unlock tools' using errcode = '42501';
  end if;
  select id, full_name into v_user, v_name from profiles where upper(member_id) = upper(trim(p_member_id));
  if v_user is null then raise exception 'No member with ID %', p_member_id; end if;
  insert into tool_access (user_id, tool, tx_ref) values (v_user, p_tool, 'manual:' || auth.uid()) on conflict do nothing;
  perform notify(v_user, 'payment_confirmed', 'Upwork Account Analyser unlocked',
    'Your payment was confirmed. Analyse your Upwork profile now.', '/tools/upwork', '{}'::jsonb);
  perform write_audit('tool_access_granted', 'profile', v_user::text, jsonb_build_object('tool', p_tool));
  return v_name;
end $$;
revoke execute on function public.grant_tool_access(text, text) from public, anon;
grant execute on function public.grant_tool_access(text, text) to authenticated;
