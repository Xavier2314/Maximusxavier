-- =============================================================================
-- MAXIMUS — 0036 Wallet: payouts to bank accounts, member-to-member transfers,
-- savings vault, and a wallet PIN.
--
-- Money only leaves a wallet when it really leaves:
--   * A payout request puts the amount on hold (it can't be spent twice).
--   * An approver (Super Admin / payment approver) approves; the server sends it
--     through Flutterwave; the ledger is debited only when Flutterwave reports
--     the transfer as successful. A failed transfer just releases the hold.
--   * Member-to-member transfers are instant and stay inside Maximus.
--   * Locked savings can't be withdrawn or sent until their unlock date.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;
alter type public.transaction_source add value if not exists 'internal_transfer';
alter type public.transaction_source add value if not exists 'payout';

-- ---------------------------------------------------------------------------
-- Wallet PIN (hashed with bcrypt; never readable by anyone)
-- ---------------------------------------------------------------------------
create table public.wallet_pins (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  pin_hash     text not null,
  failed       smallint not null default 0,
  locked_until timestamptz,
  updated_at   timestamptz not null default now()
);
alter table public.wallet_pins enable row level security;  -- no policies: only the functions below touch it

create or replace function public.has_wallet_pin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from wallet_pins where user_id = auth.uid())
$$;

create or replace function public.set_wallet_pin(p_new text, p_old text default null)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v wallet_pins%rowtype;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_new !~ '^\d{4}$' then raise exception 'Your PIN must be 4 digits.'; end if;
  if p_new in ('0000', '1111', '1234', '4321', '2222', '9999', '1212') then raise exception 'That PIN is too easy to guess. Choose another.'; end if;
  select * into v from wallet_pins where user_id = auth.uid();
  if found then
    if p_old is null or crypt(p_old, v.pin_hash) <> v.pin_hash then raise exception 'Your current PIN is wrong.'; end if;
  end if;
  insert into wallet_pins (user_id, pin_hash) values (auth.uid(), crypt(p_new, gen_salt('bf')))
  on conflict (user_id) do update set pin_hash = excluded.pin_hash, failed = 0, locked_until = null, updated_at = now();
end $$;

-- Checks the signed-in member's PIN; five wrong tries lock it for 30 minutes.
create or replace function public.check_wallet_pin(p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v wallet_pins%rowtype;
begin
  select * into v from wallet_pins where user_id = auth.uid() for update;
  if not found then raise exception 'Set your wallet PIN first.'; end if;
  if v.locked_until is not null and v.locked_until > now() then
    raise exception 'Too many wrong PINs. Try again after %.', to_char(v.locked_until at time zone 'Africa/Lagos', 'HH24:MI');
  end if;
  if p_pin is null or crypt(p_pin, v.pin_hash) <> v.pin_hash then
    update wallet_pins set failed = failed + 1,
      locked_until = case when failed + 1 >= 5 then now() + interval '30 minutes' end
    where user_id = auth.uid();
    raise exception 'Wrong PIN.';
  end if;
  update wallet_pins set failed = 0, locked_until = null where user_id = auth.uid();
end $$;

-- A Super Admin can clear a forgotten PIN; the member then sets a new one.
create or replace function public.reset_wallet_pin(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_role('super_admin') then raise exception 'Only a Super Admin can reset a PIN' using errcode = '42501'; end if;
  delete from wallet_pins where user_id = p_user;
  perform write_audit('wallet_pin_reset', 'profile', p_user::text, '{}'::jsonb);
  perform notify(p_user, 'wallet_pin_reset', 'Your wallet PIN was reset', 'Set a new PIN on the Maximus Bank page.', '/bank', '{}'::jsonb);
end $$;

-- ---------------------------------------------------------------------------
-- Savings vault
-- ---------------------------------------------------------------------------
create table public.savings_locks (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  amount     numeric(14, 2) not null check (amount > 0),
  unlock_on  date not null,
  reason     text check (length(reason) <= 120),
  created_at timestamptz not null default now()
);
create index savings_locks_user_idx on public.savings_locks (user_id, unlock_on);
alter table public.savings_locks enable row level security;
create policy savings_locks_read on public.savings_locks for select to authenticated using (can_view_finance(user_id));

-- ---------------------------------------------------------------------------
-- Payout requests
-- ---------------------------------------------------------------------------
create table public.payout_requests (
  id               uuid primary key default gen_random_uuid(),
  reference        text not null unique check (reference ~ '^MXP-[A-Za-z0-9]{10,40}$'),
  user_id          uuid not null references public.profiles (id) on delete restrict,
  account_kind     public.financial_account_kind not null,
  amount           numeric(14, 2) not null check (amount >= 100 and amount <= 5000000),
  recipient_type   text not null check (recipient_type in ('self', 'other')),
  bank_code        text not null check (bank_code ~ '^[0-9A-Za-z]{2,10}$'),
  bank_name        text not null check (length(bank_name) <= 120),
  account_number   text not null check (account_number ~ '^\d{10}$'),
  account_name     text not null check (length(account_name) between 2 and 120),
  narration        text check (length(narration) <= 100),
  status           text not null default 'pending'
                   check (status in ('pending', 'approved', 'processing', 'successful', 'failed', 'rejected', 'cancelled')),
  reviewer_id      uuid references public.profiles (id) on delete set null,
  review_note      text check (length(review_note) <= 500),
  provider_id      bigint,
  provider_message text check (length(provider_message) <= 500),
  ledger_id        uuid references public.financial_transactions (id) on delete set null,
  created_at       timestamptz not null default now(),
  decided_at       timestamptz,
  completed_at     timestamptz
);
create index payout_requests_user_idx on public.payout_requests (user_id, created_at desc);
create index payout_requests_status_idx on public.payout_requests (status, created_at);
alter table public.payout_requests enable row level security;
create policy payout_requests_own on public.payout_requests for select to authenticated using (user_id = auth.uid());
create policy payout_requests_approvers on public.payout_requests for select to authenticated
  using (has_role('super_admin') or has_permission('approve_financial_transactions'));

create or replace function public.is_payout_approver()
returns boolean language sql stable security definer set search_path = public as $$
  select has_role('super_admin') or has_permission('approve_financial_transactions')
$$;

-- Money the member can use right now in one account: confirmed balance minus
-- pending withdrawals, payouts on hold and (for savings) locked amounts.
create or replace function public.wallet_available(p_user uuid, p_kind public.financial_account_kind)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select b.confirmed_balance - b.pending_out from financial_account_balances b where b.user_id = p_user and b.kind = p_kind), 0)
       - coalesce((select sum(amount) from payout_requests where user_id = p_user and account_kind = p_kind and status in ('pending', 'approved', 'processing')), 0)
       - case when p_kind = 'savings' then coalesce((select sum(amount) from savings_locks where user_id = p_user and unlock_on > current_date), 0) else 0 end
$$;

-- Manual withdrawal requests must also respect holds and locks.
create or replace function public.ftx_check_available() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_kind financial_account_kind;
begin
  if new.direction = -1 and new.status = 'pending' then
    select kind into v_kind from financial_accounts where id = new.account_id;
    if wallet_available(new.user_id, v_kind) < new.amount then
      raise exception 'Withdrawal exceeds your available balance (locked savings and payouts on hold are excluded).';
    end if;
  end if;
  return new;
end $$;
create trigger ftx_check_available before insert on public.financial_transactions
  for each row execute function public.ftx_check_available();

create or replace function public.wallet_summary()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'savings_available', wallet_available(auth.uid(), 'savings'),
    'contributions_available', wallet_available(auth.uid(), 'contributions'),
    'locked', coalesce((select sum(amount) from savings_locks where user_id = auth.uid() and unlock_on > current_date), 0),
    'on_hold', coalesce((select sum(amount) from payout_requests where user_id = auth.uid() and status in ('pending', 'approved', 'processing')), 0),
    'has_pin', exists (select 1 from wallet_pins where user_id = auth.uid()))
$$;

create or replace function public.lock_savings(p_amount numeric, p_unlock_on date, p_reason text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if p_amount is null or p_amount < 100 then raise exception 'Lock at least ₦100.'; end if;
  if p_unlock_on is null or p_unlock_on <= current_date then raise exception 'Choose an unlock date after today.'; end if;
  if p_unlock_on > current_date + 1825 then raise exception 'The longest lock is 5 years.'; end if;
  if wallet_available(auth.uid(), 'savings') < p_amount then raise exception 'You don''t have that much available in savings.'; end if;
  insert into savings_locks (user_id, amount, unlock_on, reason) values (auth.uid(), round(p_amount, 2), p_unlock_on, nullif(trim(p_reason), ''))
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.request_payout(
  p_kind public.financial_account_kind, p_amount numeric, p_recipient_type text, p_bank_code text, p_bank_name text,
  p_account_number text, p_account_name text, p_narration text, p_pin text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_ref text; v_name text; r record;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  perform check_wallet_pin(p_pin);
  if p_amount is null or p_amount < 100 then raise exception 'The smallest withdrawal is ₦100.'; end if;
  if p_amount > 5000000 then raise exception 'The largest single withdrawal is ₦5,000,000.'; end if;
  if (select count(*) from payout_requests where user_id = auth.uid() and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You''ve reached today''s limit of 10 withdrawal requests.';
  end if;
  if wallet_available(auth.uid(), p_kind) < p_amount then
    raise exception 'Not enough available in your %. Locked savings and payouts on hold can''t be used.', p_kind;
  end if;
  v_ref := 'MXP' || '-' || replace(gen_random_uuid()::text, '-', '');
  insert into payout_requests (reference, user_id, account_kind, amount, recipient_type, bank_code, bank_name, account_number, account_name, narration)
  values (v_ref, auth.uid(), p_kind, round(p_amount, 2), p_recipient_type, p_bank_code, left(p_bank_name, 120), p_account_number,
          left(p_account_name, 120), nullif(left(trim(p_narration), 100), ''))
  returning id into v_id;
  select full_name into v_name from profiles where id = auth.uid();
  for r in select distinct ur.user_id from user_roles ur join roles ro on ro.id = ur.role_id
           where ro.key in ('super_admin', 'earnings_manager') and ur.user_id <> auth.uid()
  loop
    perform notify(r.user_id, 'payout_request', 'Withdrawal to approve: ₦' || to_char(p_amount, 'FM999,999,990'),
      v_name || ' → ' || p_account_name || ' (' || p_bank_name || ')', '/admin/payouts', jsonb_build_object('payout_id', v_id));
  end loop;
  perform write_audit('payout_requested', 'payout', v_id::text, jsonb_build_object('amount', p_amount, 'bank', p_bank_name));
  return v_id;
end $$;

create or replace function public.cancel_payout(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update payout_requests set status = 'cancelled', decided_at = now() where id = p_id and user_id = auth.uid() and status = 'pending';
  if not found then raise exception 'This request can no longer be cancelled.'; end if;
end $$;

-- Approver decides. Approving only marks it ready; the server then sends it via Flutterwave.
create or replace function public.decide_payout(p_id uuid, p_approve boolean, p_note text default null)
returns payout_requests language plpgsql security definer set search_path = public as $$
declare p payout_requests%rowtype;
begin
  if not is_payout_approver() then raise exception 'You are not allowed to approve payouts' using errcode = '42501'; end if;
  select * into p from payout_requests where id = p_id for update;
  if not found or p.status <> 'pending' then raise exception 'This request was already handled.'; end if;
  if p.user_id = auth.uid() then raise exception 'You can''t approve your own withdrawal. Ask another approver.'; end if;
  if p_approve then
    -- The hold already covers this amount; make sure the balance is still there.
    if wallet_available(p.user_id, p.account_kind) + p.amount < p.amount then raise exception 'The member no longer has enough balance.'; end if;
    update payout_requests set status = 'approved', reviewer_id = auth.uid(), review_note = nullif(trim(p_note), ''), decided_at = now()
      where id = p_id returning * into p;
  else
    update payout_requests set status = 'rejected', reviewer_id = auth.uid(), review_note = nullif(trim(p_note), ''), decided_at = now()
      where id = p_id returning * into p;
    perform notify(p.user_id, 'payout_rejected', 'Withdrawal not approved',
      coalesce(nullif(trim(p_note), ''), 'Your money is back in your wallet.'), '/bank', jsonb_build_object('payout_id', p.id));
  end if;
  perform write_audit(case when p_approve then 'payout_approved' else 'payout_rejected' end, 'payout', p.id::text, jsonb_build_object('note', p_note));
  return p;
end $$;

-- Server only: Flutterwave accepted the transfer.
create or replace function public.mark_payout_sent(p_reference text, p_provider_id bigint, p_message text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  update payout_requests set status = 'processing', provider_id = p_provider_id, provider_message = left(p_message, 500)
  where reference = p_reference and status = 'approved';
end $$;

-- Server only: the transfer finished. Debits the wallet only on success. Safe to call twice.
create or replace function public.finish_payout(p_reference text, p_success boolean, p_provider_id bigint, p_message text default null)
returns text language plpgsql security definer set search_path = public as $$
declare p payout_requests%rowtype; v_acc uuid; v_ledger uuid;
begin
  select * into p from payout_requests where reference = p_reference for update;
  if not found then return 'unknown'; end if;
  if p.status in ('successful', 'failed', 'rejected', 'cancelled') then return 'already'; end if;
  if p.status not in ('approved', 'processing') then return 'not_approved'; end if;
  if p_success then
    select id into v_acc from financial_accounts where user_id = p.user_id and kind = p.account_kind;
    perform set_config('maximus.payout_debit', 'on', true);
    insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source, note, created_by)
      values (v_acc, p.user_id, 'withdrawal', -1, p.amount, 'confirmed', 'payout',
              'Sent to ' || p.account_name || ' · ' || p.bank_name || ' · ' || right(p.account_number, 4) || ' (' || p.reference || ')', p.reviewer_id)
      returning id into v_ledger;
    update payout_requests set status = 'successful', provider_id = coalesce(p_provider_id, provider_id), provider_message = left(p_message, 500),
      ledger_id = v_ledger, completed_at = now() where id = p.id;
    perform notify(p.user_id, 'payout_sent', '₦' || to_char(p.amount, 'FM999,999,990') || ' sent',
      'To ' || p.account_name || ' (' || p.bank_name || ').', '/bank', jsonb_build_object('payout_id', p.id));
  else
    update payout_requests set status = 'failed', provider_id = coalesce(p_provider_id, provider_id), provider_message = left(p_message, 500),
      completed_at = now() where id = p.id;
    perform notify(p.user_id, 'payout_failed', 'Withdrawal didn''t go through',
      'Your money is back in your wallet.' || coalesce(' Reason: ' || left(p_message, 120), ''), '/bank', jsonb_build_object('payout_id', p.id));
  end if;
  perform write_audit(case when p_success then 'payout_successful' else 'payout_failed' end, 'payout', p.id::text,
    jsonb_build_object('provider_id', p_provider_id, 'message', p_message));
  return case when p_success then 'successful' else 'failed' end;
end $$;

-- ---------------------------------------------------------------------------
-- Member-to-member transfers (instant, inside Maximus)
-- ---------------------------------------------------------------------------
create or replace function public.member_name_by_code(p_code text)
returns text language sql stable security definer set search_path = public as $$
  select full_name from profiles where member_id = upper(trim(p_code)) and status = 'active' and id <> auth.uid()
$$;

create or replace function public.send_to_member(p_code text, p_amount numeric, p_kind public.financial_account_kind, p_note text, p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare v_to profiles%rowtype; v_from_acc uuid; v_to_acc uuid; v_sent_today numeric; v_me text;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  perform check_wallet_pin(p_pin);
  select * into v_to from profiles where member_id = upper(trim(p_code)) and status = 'active';
  if not found then raise exception 'No active member has that Maximus ID.'; end if;
  if v_to.id = auth.uid() then raise exception 'You can''t send money to yourself.'; end if;
  if p_amount is null or p_amount < 50 then raise exception 'The smallest transfer is ₦50.'; end if;
  select coalesce(sum(amount), 0) into v_sent_today from financial_transactions
    where user_id = auth.uid() and source = 'internal_transfer' and direction = -1 and created_at > now() - interval '1 day';
  if v_sent_today + p_amount > 500000 then raise exception 'You can send up to ₦500,000 to members per day.'; end if;
  if wallet_available(auth.uid(), p_kind) < p_amount then raise exception 'Not enough available in your %.', p_kind; end if;

  select id into v_from_acc from financial_accounts where user_id = auth.uid() and kind = p_kind;
  select id into v_to_acc from financial_accounts where user_id = v_to.id and kind = 'savings';
  if v_to_acc is null then
    insert into financial_accounts (user_id, kind, name) values (v_to.id, 'savings', 'Savings') returning id into v_to_acc;
  end if;
  select full_name into v_me from profiles where id = auth.uid();
  perform set_config('maximus.payout_debit', 'on', true);
  insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source, note, created_by)
    values (v_from_acc, auth.uid(), 'withdrawal', -1, round(p_amount, 2), 'confirmed', 'internal_transfer',
            'Sent to ' || v_to.full_name || ' (' || v_to.member_id || ')' || coalesce(': ' || nullif(left(trim(p_note), 100), ''), ''), auth.uid());
  insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source, note, created_by)
    values (v_to_acc, v_to.id, 'deposit', 1, round(p_amount, 2), 'confirmed', 'internal_transfer',
            'From ' || v_me || coalesce(': ' || nullif(left(trim(p_note), 100), ''), ''), auth.uid());
  perform notify(v_to.id, 'wallet_received', 'You received ₦' || to_char(p_amount, 'FM999,999,990'),
    'From ' || v_me || coalesce(': ' || nullif(left(trim(p_note), 100), ''), '') || '.', '/bank', '{}'::jsonb);
  perform write_audit('member_transfer', 'profile', v_to.id::text, jsonb_build_object('amount', p_amount, 'from', auth.uid()));
  return v_to.full_name;
end $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
do $do$
declare f text;
begin
  foreach f in array array[
    'has_wallet_pin()', 'set_wallet_pin(text, text)', 'reset_wallet_pin(uuid)', 'wallet_summary()', 'lock_savings(numeric, date, text)',
    'request_payout(financial_account_kind, numeric, text, text, text, text, text, text, text)', 'cancel_payout(uuid)',
    'decide_payout(uuid, boolean, text)', 'member_name_by_code(text)', 'send_to_member(text, numeric, financial_account_kind, text, text)',
    'is_payout_approver()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  foreach f in array array['check_wallet_pin(text)', 'wallet_available(uuid, financial_account_kind)',
    'mark_payout_sent(text, bigint, text)', 'finish_payout(text, boolean, bigint, text)']
  loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
  execute 'grant execute on function public.mark_payout_sent(text, bigint, text) to service_role';
  execute 'grant execute on function public.finish_payout(text, boolean, bigint, text) to service_role';
end
$do$;
