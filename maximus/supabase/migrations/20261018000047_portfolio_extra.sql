-- =============================================================================
-- MAXIMUS — 0047 More than one portfolio website (paid add-on)
-- Every member gets one portfolio website free. A one-time payment (₦500 by
-- default) unlocks creating more, up to 10.
-- =============================================================================

alter table public.portfolios add column if not exists id uuid not null default gen_random_uuid();
alter table public.portfolios add column if not exists title text check (length(title) <= 60);
alter table public.portfolios drop constraint if exists portfolios_pkey;
alter table public.portfolios add primary key (id);
alter table public.portfolios alter column user_id set not null;
create index if not exists portfolios_user_idx on public.portfolios (user_id);
grant update (title) on public.portfolios to authenticated;

alter table public.tool_access drop constraint if exists tool_access_tool_check;
alter table public.tool_access add constraint tool_access_tool_check check (tool in ('upwork_analyser', 'extra_portfolios'));
alter table public.online_payments drop constraint if exists online_payments_purpose_check;
alter table public.online_payments add constraint online_payments_purpose_check
  check (purpose in ('white_label', 'savings', 'contributions', 'upwork_analyser', 'company_whitelabel', 'portfolio_extra'));

-- First site free; more need the add-on. Never more than 10.
create or replace function public.can_add_portfolio()
returns boolean language sql stable security definer set search_path = public as $$
  select (select count(*) from portfolios where user_id = auth.uid()) = 0
      or ((select count(*) from portfolios where user_id = auth.uid()) < 10 and has_tool_access('extra_portfolios'))
$$;
revoke execute on function public.can_add_portfolio() from public, anon;
grant execute on function public.can_add_portfolio() to authenticated;

alter policy portfolios_own_insert on public.portfolios
  with check (user_id = auth.uid() and public.can_add_portfolio());

-- A free link name for a new site: the member's name, plus a word (e.g. their niche) when given.
create or replace function public.suggest_portfolio_slug(p_hint text default null)
returns text language plpgsql stable security definer set search_path = public as $$
declare base text; v text; n int := 1;
begin
  if auth.uid() is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select trim(both '-' from regexp_replace(lower(full_name || coalesce(' ' || nullif(trim(p_hint), ''), '')), '[^a-z0-9]+', '-', 'g'))
    into base from profiles where id = auth.uid();
  base := trim(both '-' from left(coalesce(nullif(base, ''), 'member'), 34));
  if length(base) < 3 then base := base || '-me'; end if;
  v := base;
  while exists (select 1 from portfolios where slug = v) loop n := n + 1; v := base || '-' || n; end loop;
  return v;
end $$;
revoke execute on function public.suggest_portfolio_slug(text) from public, anon;
revoke execute on function public.suggest_portfolio_slug() from public, anon, authenticated;
grant execute on function public.suggest_portfolio_slug(text) to authenticated;

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
  elsif p_purpose = 'portfolio_extra' then
    if has_tool_access('extra_portfolios') then raise exception 'You can already create more portfolio websites.'; end if;
    v_amount := coalesce((select (value->>'amount')::numeric from app_settings where key = 'portfolio_extra_price'), 500);
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
  elsif p.purpose = 'portfolio_extra' then
    insert into tool_access (user_id, tool, tx_ref) values (p.user_id, 'extra_portfolios', p.tx_ref) on conflict do nothing;
    perform notify(p.user_id, 'payment_confirmed', 'More portfolio websites unlocked',
      'Payment received. You can now create more portfolio websites.', '/tools/portfolio', jsonb_build_object('tx_ref', p.tx_ref));
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
