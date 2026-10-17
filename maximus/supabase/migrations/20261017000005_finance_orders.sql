-- =============================================================================
-- MAXIMUS — 0005 Financial Ledger & Orders
-- Balances are never stored: they are always computed from an append-only
-- transaction ledger. Corrections are new transactions (adjustment/reversal),
-- never edits. Self-reported entries stay 'pending' until an approver confirms
-- them, and even confirmed entries are organisation records, not bank balances.
-- =============================================================================

create type public.financial_account_kind as enum ('savings', 'contributions');
create type public.transaction_kind as enum ('deposit', 'contribution', 'withdrawal', 'adjustment', 'reversal');
create type public.transaction_status as enum ('pending', 'confirmed', 'rejected');
create type public.transaction_source as enum ('self_reported', 'admin_recorded');

create table public.financial_accounts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  kind          public.financial_account_kind not null,
  name          text not null,
  target_amount numeric(14, 2) check (target_amount >= 0),
  currency      text not null default 'NGN',
  created_at    timestamptz not null default now(),
  unique (user_id, kind)
);

create or replace function public.profiles_create_accounts() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into financial_accounts (user_id, kind, name) values
    (new.id, 'savings', 'Savings'), (new.id, 'contributions', 'Contributions')
  on conflict do nothing;
  return new;
end $$;
create trigger profiles_create_accounts after insert on public.profiles
  for each row execute function public.profiles_create_accounts();

create table public.financial_transactions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.financial_accounts (id) on delete restrict,
  user_id      uuid not null references public.profiles (id) on delete restrict,
  kind         public.transaction_kind not null,
  direction    smallint not null check (direction in (-1, 1)),
  amount       numeric(14, 2) not null check (amount > 0),
  status       public.transaction_status not null default 'pending',
  source       public.transaction_source not null,
  occurred_on  date not null default current_date,
  receipt_path text,
  note         text check (length(note) <= 1000),
  reference_id uuid references public.financial_transactions (id) on delete restrict,
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  constraint ftx_withdrawal_is_debit check (kind <> 'withdrawal' or direction = -1),
  constraint ftx_deposit_is_credit check (kind not in ('deposit', 'contribution') or direction = 1)
);
create index ftx_user_date_idx on public.financial_transactions (user_id, occurred_on desc);
create index ftx_account_idx on public.financial_transactions (account_id, status);
create index ftx_pending_idx on public.financial_transactions (created_at) where status = 'pending';

create table public.payment_approvals (
  id             uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.financial_transactions (id) on delete restrict,
  decided_by     uuid not null references public.profiles (id) on delete restrict,
  decision       public.transaction_status not null check (decision in ('confirmed', 'rejected')),
  reason         text check (length(reason) <= 1000),
  decided_at     timestamptz not null default now()
);

create table public.financial_obligations (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  title          text not null check (length(trim(title)) between 2 and 200),
  amount         numeric(14, 2) not null check (amount > 0),
  due_date       date,
  status         text not null default 'open' check (status in ('open', 'settled', 'waived')),
  settled_txn_id uuid references public.financial_transactions (id) on delete set null,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index financial_obligations_user_idx on public.financial_obligations (user_id, status);

-- Explicit, member-controlled sharing of financial records with a leader.
create table public.financial_access_grants (
  member_id  uuid not null references public.profiles (id) on delete cascade,
  viewer_id  uuid not null references public.profiles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (member_id, viewer_id),
  check (member_id <> viewer_id)
);

create or replace function public.can_view_finance(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or public.has_permission('approve_financial_transactions')
      or (public.has_permission('view_authorized_financials')
          and public.can_view_team_data(target)
          and exists (select 1 from public.financial_access_grants
                      where member_id = target and viewer_id = auth.uid()))
$$;

-- Ledger immutability: no deletes, and the only permitted update is the
-- pending → confirmed/rejected decision made inside decide_transaction().
create or replace function public.ftx_immutable() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Ledger entries cannot be deleted; record a reversal instead';
  end if;
  if current_setting('maximus.ledger_decision', true) is distinct from 'on'
     or old.status <> 'pending'
     or (to_jsonb(new) - 'status') <> (to_jsonb(old) - 'status') then
    raise exception 'Ledger entries are immutable; record an adjustment or reversal instead';
  end if;
  return new;
end $$;
create trigger ftx_immutable before update or delete on public.financial_transactions
  for each row execute function public.ftx_immutable();

create or replace function public.payment_approvals_immutable() returns trigger
language plpgsql as $$ begin raise exception 'Approval records are immutable'; end $$;
create trigger payment_approvals_immutable before update or delete on public.payment_approvals
  for each row execute function public.payment_approvals_immutable();

-- Balances, always derived from the ledger.
create or replace view public.financial_account_balances with (security_invoker = true) as
select
  a.id as account_id, a.user_id, a.kind, a.name, a.target_amount, a.currency,
  coalesce(sum(t.direction * t.amount) filter (where t.status = 'confirmed'), 0)::numeric(14, 2) as confirmed_balance,
  coalesce(sum(t.amount) filter (where t.status = 'pending' and t.direction = 1), 0)::numeric(14, 2) as pending_in,
  coalesce(sum(t.amount) filter (where t.status = 'pending' and t.direction = -1), 0)::numeric(14, 2) as pending_out
from public.financial_accounts a
left join public.financial_transactions t on t.account_id = a.id
group by a.id;

create or replace function public.submit_transaction(
  p_kind public.transaction_kind, p_amount numeric, p_account_kind public.financial_account_kind,
  p_note text default null, p_receipt_path text default null, p_occurred_on date default current_date
) returns public.financial_transactions
language plpgsql security definer set search_path = public as $$
declare v_acc financial_accounts; v_bal record; v_row financial_transactions;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  if p_kind not in ('deposit', 'contribution', 'withdrawal') then
    raise exception 'Members can submit deposits, contributions or withdrawal requests only';
  end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Amount must be greater than zero'; end if;
  if p_occurred_on > current_date then raise exception 'Date cannot be in the future'; end if;
  if p_receipt_path is not null and p_receipt_path not like auth.uid()::text || '/%' then
    raise exception 'Invalid receipt path';
  end if;
  select * into v_acc from financial_accounts where user_id = auth.uid() and kind = p_account_kind;
  if p_kind = 'withdrawal' then
    select * into v_bal from financial_account_balances where account_id = v_acc.id;
    if v_bal.confirmed_balance - v_bal.pending_out < p_amount then
      raise exception 'Withdrawal exceeds your available confirmed balance';
    end if;
  end if;
  insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source,
                                      occurred_on, receipt_path, note, created_by)
  values (v_acc.id, auth.uid(), p_kind, case when p_kind = 'withdrawal' then -1 else 1 end, round(p_amount, 2),
          'pending', 'self_reported', p_occurred_on, p_receipt_path, nullif(trim(p_note), ''), auth.uid())
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.decide_transaction(p_id uuid, p_approve boolean, p_reason text default null)
returns public.financial_transactions
language plpgsql security definer set search_path = public as $$
declare v_row financial_transactions; v_bal record;
begin
  if not has_permission('approve_financial_transactions') then
    raise exception 'You are not authorised to approve transactions' using errcode = '42501';
  end if;
  select * into v_row from financial_transactions where id = p_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_row.user_id = auth.uid() then raise exception 'You cannot approve your own transaction'; end if;
  if v_row.status <> 'pending' then raise exception 'This transaction has already been decided'; end if;
  if p_approve and v_row.direction = -1 then
    select * into v_bal from financial_account_balances where account_id = v_row.account_id;
    if v_bal.confirmed_balance < v_row.amount then
      raise exception 'Insufficient confirmed balance to approve this withdrawal';
    end if;
  end if;

  perform set_config('maximus.ledger_decision', 'on', true);
  update financial_transactions
    set status = case when p_approve then 'confirmed'::transaction_status else 'rejected'::transaction_status end
  where id = p_id returning * into v_row;
  perform set_config('maximus.ledger_decision', 'off', true);

  insert into payment_approvals (transaction_id, decided_by, decision, reason)
  values (p_id, auth.uid(), v_row.status, nullif(trim(p_reason), ''));

  perform notify(v_row.user_id, 'fund_update',
    case when p_approve then 'Payment confirmed' else 'Payment not approved' end,
    initcap(v_row.kind::text) || ' of ' || to_char(v_row.amount, 'FM999,999,999,990.00')
      || case when p_approve then ' was confirmed.' else ' was rejected' || coalesce(': ' || p_reason, '.') end,
    '/finance', jsonb_build_object('transaction_id', p_id));
  perform write_audit(case when p_approve then 'transaction_confirmed' else 'transaction_rejected' end,
                      'financial_transaction', p_id::text,
                      jsonb_build_object('member', v_row.user_id, 'amount', v_row.amount, 'reason', p_reason));
  return v_row;
end $$;

-- Auditable correction: a new confirmed entry, linked to the entry it corrects.
create or replace function public.record_adjustment(
  p_user uuid, p_account_kind public.financial_account_kind, p_direction smallint, p_amount numeric,
  p_note text, p_reference uuid default null
) returns public.financial_transactions
language plpgsql security definer set search_path = public as $$
declare v_acc financial_accounts; v_row financial_transactions;
begin
  if not has_permission('approve_financial_transactions') then
    raise exception 'You are not authorised to record adjustments' using errcode = '42501';
  end if;
  if p_user = auth.uid() then raise exception 'You cannot adjust your own records'; end if;
  if nullif(trim(p_note), '') is null then raise exception 'A reason is required for every adjustment'; end if;
  select * into v_acc from financial_accounts where user_id = p_user and kind = p_account_kind;
  if not found then raise exception 'Account not found'; end if;
  insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source, note, reference_id, created_by)
  values (v_acc.id, p_user, 'adjustment', p_direction, round(p_amount, 2), 'confirmed', 'admin_recorded',
          trim(p_note), p_reference, auth.uid())
  returning * into v_row;
  perform write_audit('ledger_adjustment', 'financial_transaction', v_row.id::text,
                      jsonb_build_object('member', p_user, 'direction', p_direction, 'amount', p_amount, 'note', p_note));
  perform notify(p_user, 'fund_update', 'Ledger adjustment recorded', trim(p_note), '/finance',
                 jsonb_build_object('transaction_id', v_row.id));
  return v_row;
end $$;

create or replace function public.reverse_transaction(p_id uuid, p_reason text)
returns public.financial_transactions
language plpgsql security definer set search_path = public as $$
declare v_orig financial_transactions; v_row financial_transactions;
begin
  if not has_permission('approve_financial_transactions') then
    raise exception 'You are not authorised to reverse transactions' using errcode = '42501';
  end if;
  if nullif(trim(p_reason), '') is null then raise exception 'A reason is required'; end if;
  select * into v_orig from financial_transactions where id = p_id;
  if not found or v_orig.status <> 'confirmed' then raise exception 'Only confirmed transactions can be reversed'; end if;
  if v_orig.user_id = auth.uid() then raise exception 'You cannot reverse your own transaction'; end if;
  if exists (select 1 from financial_transactions where reference_id = p_id and kind = 'reversal') then
    raise exception 'This transaction has already been reversed';
  end if;
  insert into financial_transactions (account_id, user_id, kind, direction, amount, status, source, note, reference_id, created_by)
  values (v_orig.account_id, v_orig.user_id, 'reversal', -v_orig.direction, v_orig.amount, 'confirmed',
          'admin_recorded', trim(p_reason), p_id, auth.uid())
  returning * into v_row;
  perform write_audit('ledger_reversal', 'financial_transaction', v_row.id::text,
                      jsonb_build_object('reverses', p_id, 'reason', p_reason));
  return v_row;
end $$;

-- -----------------------------------------------------------------------------
-- Orders & business activity
-- -----------------------------------------------------------------------------
create type public.order_status as enum ('pending', 'confirmed', 'delivered', 'cancelled');

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  member_id       uuid not null references public.profiles (id) on delete cascade,
  recorded_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  customer_name   text check (length(customer_name) <= 120),
  customer_member uuid references public.profiles (id) on delete set null,
  amount          numeric(14, 2) not null check (amount >= 0),
  business_volume numeric(14, 2) check (business_volume >= 0),
  category        text check (length(category) <= 80),
  status          public.order_status not null default 'pending',
  order_date      date not null default current_date check (order_date <= current_date + 1),
  notes           text check (length(notes) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index orders_member_date_idx on public.orders (member_id, order_date desc);
create index orders_date_idx on public.orders (order_date desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create or replace function public.can_record_order_for(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select target = auth.uid()
      or public.has_permission('view_org_analytics')
      or (public.has_permission('view_team_dashboard') and public.can_view_team_data(target))
$$;

create or replace function public.orders_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sponsor uuid; v_name text; v_month date := date_trunc('month', new.order_date)::date;
  v_target numeric; v_before numeric; v_after numeric;
begin
  select sponsor_id, full_name into v_sponsor, v_name from profiles where id = new.member_id;
  perform notify(v_sponsor, 'order_recorded', 'New team order',
                 v_name || ' recorded an order of ' || to_char(new.amount, 'FM999,999,999,990.00') || '.',
                 '/orders', jsonb_build_object('order_id', new.id));

  select sales_target into v_target from monthly_goals
  where user_id = new.member_id and month = v_month and status in ('submitted', 'approved');
  if v_target is not null and v_target > 0 and new.status <> 'cancelled' then
    select coalesce(sum(amount), 0) into v_after from orders
    where member_id = new.member_id and status <> 'cancelled'
      and order_date >= v_month and order_date < v_month + interval '1 month';
    v_before := v_after - new.amount;
    if v_before < v_target and v_after >= v_target then
      perform notify(new.member_id, 'order_milestone', 'Sales target reached 🏆',
                     'You hit your ' || to_char(v_month, 'FMMonth') || ' sales target. Outstanding!', '/goals', '{}'::jsonb);
      perform notify(v_sponsor, 'order_milestone', 'A downline reached a sales target',
                     v_name || ' reached their ' || to_char(v_month, 'FMMonth') || ' sales target.', '/team', '{}'::jsonb);
    end if;
  end if;
  return new;
end $$;
create trigger orders_notify after insert on public.orders
  for each row execute function public.orders_notify();

-- Goal progress computed from real activity (never typed in by hand).
create or replace function public.goal_progress(p_goal uuid)
returns jsonb language sql stable security invoker set search_path = public as $$
  with g as (select * from monthly_goals where id = p_goal),
  rng as (select g.user_id, g.month as s, (g.month + interval '1 month')::date as e from g)
  select jsonb_build_object(
    'income',      (select coalesce(sum(e.earnings), 0) from evaluations e, rng
                    where e.user_id = rng.user_id and e.period_date >= rng.s and e.period_date < rng.e),
    'prospecting', (select coalesce(sum(e.prospects), 0) from evaluations e, rng
                    where e.user_id = rng.user_id and e.period_date >= rng.s and e.period_date < rng.e),
    'sales',       (select coalesce(sum(o.amount), 0) from orders o, rng
                    where o.member_id = rng.user_id and o.status <> 'cancelled' and o.order_date >= rng.s and o.order_date < rng.e),
    'orders',      (select count(*) from orders o, rng
                    where o.member_id = rng.user_id and o.status <> 'cancelled' and o.order_date >= rng.s and o.order_date < rng.e),
    'recruitment', (select count(*) from profiles p, rng
                    where p.sponsor_id = rng.user_id and p.joined_at >= rng.s and p.joined_at < rng.e),
    'savings',     (select coalesce(sum(t.direction * t.amount), 0) from financial_transactions t
                    join financial_accounts a on a.id = t.account_id, rng
                    where a.user_id = rng.user_id and a.kind = 'savings' and t.status = 'confirmed'
                      and t.occurred_on >= rng.s and t.occurred_on < rng.e))
$$;

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.financial_accounts enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.payment_approvals enable row level security;
alter table public.financial_obligations enable row level security;
alter table public.financial_access_grants enable row level security;
alter table public.orders enable row level security;

create policy financial_accounts_read on public.financial_accounts for select to authenticated
  using (public.can_view_finance(user_id));
-- Members may set their own savings target; nothing else.
create policy financial_accounts_update_target on public.financial_accounts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, delete, update on public.financial_accounts from authenticated, anon;
grant update (target_amount) on public.financial_accounts to authenticated;

create policy ftx_read on public.financial_transactions for select to authenticated
  using (public.can_view_finance(user_id));
revoke insert, update, delete on public.financial_transactions from authenticated, anon;

create policy payment_approvals_read on public.payment_approvals for select to authenticated
  using (exists (select 1 from public.financial_transactions t where t.id = transaction_id
                 and public.can_view_finance(t.user_id)));
revoke insert, update, delete on public.payment_approvals from authenticated, anon;

create policy financial_obligations_read on public.financial_obligations for select to authenticated
  using (public.can_view_finance(user_id));
create policy financial_obligations_write on public.financial_obligations for all to authenticated
  using (public.has_permission('approve_financial_transactions') and user_id <> auth.uid())
  with check (public.has_permission('approve_financial_transactions') and user_id <> auth.uid());

-- Members share with leaders in their own upline chain; admins see everything anyway.
create policy fag_read on public.financial_access_grants for select to authenticated
  using (member_id = auth.uid() or viewer_id = auth.uid() or public.has_permission('manage_roles'));
create policy fag_insert on public.financial_access_grants for insert to authenticated
  with check (member_id = auth.uid() and public.is_my_upline(viewer_id));
create policy fag_delete on public.financial_access_grants for delete to authenticated
  using (member_id = auth.uid() or public.has_permission('manage_roles'));

create policy orders_read on public.orders for select to authenticated
  using (member_id = auth.uid() or recorded_by = auth.uid() or public.can_view_team_data(member_id));
create policy orders_insert on public.orders for insert to authenticated
  with check (recorded_by = auth.uid() and public.can_record_order_for(member_id));
create policy orders_update on public.orders for update to authenticated
  using (recorded_by = auth.uid() or public.has_permission('view_org_analytics'))
  with check (public.can_record_order_for(member_id));
