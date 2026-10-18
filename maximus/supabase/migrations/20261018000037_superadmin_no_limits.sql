-- =============================================================================
-- MAXIMUS — 0037 Super Admins may approve their own payouts and manual payments.
-- Daily caps and balance checks still apply to everyone.
-- =============================================================================

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
  if v_row.user_id = auth.uid() and not has_role('super_admin') then raise exception 'You cannot approve your own transaction'; end if;
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



create or replace function public.decide_payout(p_id uuid, p_approve boolean, p_note text default null)
returns payout_requests language plpgsql security definer set search_path = public as $$
declare p payout_requests%rowtype;
begin
  if not is_payout_approver() then raise exception 'You are not allowed to approve payouts' using errcode = '42501'; end if;
  select * into p from payout_requests where id = p_id for update;
  if not found or p.status <> 'pending' then raise exception 'This request was already handled.'; end if;
  if p.user_id = auth.uid() and not has_role('super_admin') then raise exception 'You can''t approve your own withdrawal. Ask another approver.'; end if;
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
