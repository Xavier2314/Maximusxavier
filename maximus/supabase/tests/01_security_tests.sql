-- LOCAL TESTING ONLY. Exercises RLS policies and server-side rules.
-- Run with: ./supabase/tests/run.sh
-- Every check raises an exception on failure, so a clean run means all passed.

\set ON_ERROR_STOP on

-- Helper: act as a given user (or reset to the superuser with NULL).
create or replace function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  if p_user is null then
    perform set_config('request.jwt.claim.sub', '', false);
    execute 'reset role';
  else
    perform set_config('request.jwt.claim.sub', p_user::text, false);
    execute 'set role authenticated';
  end if;
end $$;

create or replace function pg_temp.expect_error(p_sql text, p_label text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    raise notice 'PASS (blocked as expected): %', p_label;
    return;
  end;
  raise exception 'FAIL: % — statement should have been blocked', p_label;
end $$;

-- ---------------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------------
insert into public.offices (id, name, address, latitude, longitude, radius_m) values
  ('00000000-0000-0000-0000-0000000000f1', 'Lagos HQ', 'Gbagada, Lagos', 6.5560, 3.3920, 100);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test.dev',  '{"full_name":"Ada Admin","office_id":"00000000-0000-0000-0000-0000000000f1"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'leader@test.dev', '{"full_name":"Lola Leader","office_id":"00000000-0000-0000-0000-0000000000f1"}'),
  ('00000000-0000-0000-0000-0000000000e1', 'outsider@test.dev','{"full_name":"Oscar Outsider"}');

-- Sponsor registers with the leader's member ID; members chain beneath.
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000b1', 'sponsor@test.dev',
       jsonb_build_object('full_name', 'Sam Sponsor', 'referral_code', member_id, 'office_id', '00000000-0000-0000-0000-0000000000f1')
from public.profiles where email = 'leader@test.dev';
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000c1', 'member1@test.dev',
       jsonb_build_object('full_name', 'Mary Member', 'referral_code', referral_code, 'office_id', '00000000-0000-0000-0000-0000000000f1',
                          'date_of_birth', '1995-' || to_char(current_date, 'MM-DD'), 'birthday_visibility', 'day_month')
from public.profiles where email = 'sponsor@test.dev';
insert into auth.users (id, email, raw_user_meta_data)
select '00000000-0000-0000-0000-0000000000d1', 'member2@test.dev',
       jsonb_build_object('full_name', 'Mike Member', 'referral_code', referral_code)
from public.profiles where email = 'member1@test.dev';

select public.bootstrap_super_admin('admin@test.dev');
insert into public.user_roles (user_id, role_id)
select '00000000-0000-0000-0000-0000000000a1', id from public.roles where key = 'team_leader';

do $$ begin
  assert (select count(*) from public.profiles) = 6, 'six profiles created';
  assert (select member_id from public.profiles where email = 'admin@test.dev') like 'MX-%', 'member ID assigned';
  assert (select count(*) from public.team_relationships where descendant_id = '00000000-0000-0000-0000-0000000000d1') = 4,
    'member2 has 3 ancestors + self in closure table';
  assert exists (select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
                 where ur.user_id = '00000000-0000-0000-0000-0000000000c1' and r.key = 'sponsor'),
    'member1 automatically became a sponsor';
  assert exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000000b1' and type = 'team_registration'),
    'sponsor notified of new registration';
  assert (select count(*) from public.financial_accounts) = 12, 'savings + contributions accounts for everyone';
  raise notice 'PASS: registration, member IDs, closure table, derived roles, accounts';
end $$;

-- Unknown referral code is rejected.
select pg_temp.expect_error(
  $$insert into auth.users (email, raw_user_meta_data) values ('bad@test.dev', '{"full_name":"Bad Ref","referral_code":"NOPE1234"}')$$,
  'registration with unknown referral code');

-- ---------------------------------------------------------------------------
-- Profile visibility
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');  -- outsider
do $$ begin
  assert (select count(*) from public.profiles) = 1, 'outsider sees only themselves';
  raise notice 'PASS: outsider isolation';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');  -- member2 (bottom of chain)
do $$ begin
  assert (select count(*) from public.profiles) = 2, 'member2 sees self + sponsor only';
  raise notice 'PASS: member sees own sponsor profile';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');  -- member1: sponsor role only
do $$ begin
  -- sponsor role → direct downlines only, plus self and own sponsor; not the leader above.
  assert (select count(*) from public.profiles) = 3, 'member1 sees self, direct downline, own sponsor';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
    'member1 cannot see the leader two levels up';
  raise notice 'PASS: sponsor scoped to direct downlines';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');  -- sponsor who is also an upline
do $$ begin
  assert exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000d1'),
    'upline role grants the extended downline';
  raise notice 'PASS: upline sees extended downline';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');  -- team leader
do $$ begin
  assert (select count(*) from public.profiles) = 4, 'leader sees self + whole downline (3)';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-0000000000e1'),
    'leader cannot see another branch';
  raise notice 'PASS: leader sees extended downline only';
end $$;

-- Members cannot change protected columns.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$update public.profiles set member_id = 'MX-HACKED' where id = auth.uid()$$, 'change own member ID');
select pg_temp.expect_error($$update public.profiles set sponsor_id = null where id = auth.uid()$$, 'change own sponsor');
select pg_temp.expect_error($$update public.profiles set status = 'active' where id = auth.uid()$$, 'change own status');
update public.profiles set bio = 'Building my future' where id = auth.uid();
select pg_temp.expect_error($$insert into public.user_roles (user_id, role_id) select auth.uid(), id from public.roles where key = 'super_admin'$$,
  'self-grant super admin');

-- Role management
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($$select public.assign_role('00000000-0000-0000-0000-0000000000c1', 'team_leader')$$,
  'team leader without manage_roles cannot assign roles');

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.assign_role('00000000-0000-0000-0000-0000000000b1', 'executive_admin');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
select pg_temp.expect_error($$select public.assign_role('00000000-0000-0000-0000-0000000000c1', 'super_admin')$$,
  'executive admin cannot grant super admin');
select pg_temp.expect_error($$select public.assign_role('00000000-0000-0000-0000-0000000000c1', 'executive_admin')$$,
  'executive admin cannot grant their own level');
select public.assign_role('00000000-0000-0000-0000-0000000000c1', 'team_leader');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.revoke_role('00000000-0000-0000-0000-0000000000b1', 'executive_admin');
select public.revoke_role('00000000-0000-0000-0000-0000000000c1', 'team_leader');

-- Cycle prevention: put the leader under their own grand-downline.
select pg_temp.expect_error($$select public.change_sponsor('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000d1')$$,
  'circular sponsorship');

-- Re-parenting keeps the closure table consistent: move member2 under the sponsor.
select public.change_sponsor('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert not exists (select 1 from public.team_relationships
                     where ancestor_id = '00000000-0000-0000-0000-0000000000c1' and descendant_id = '00000000-0000-0000-0000-0000000000d1'),
    'old ancestor link removed';
  assert (select depth from public.team_relationships
          where ancestor_id = '00000000-0000-0000-0000-0000000000a1' and descendant_id = '00000000-0000-0000-0000-0000000000d1') = 2,
    'new depth correct';
  raise notice 'PASS: sponsor change rebuilds closure table';
end $$;
select public.change_sponsor('00000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-0000000000c1');
select pg_temp.act_as(null);
do $$ begin
  assert (select count(*) from public.audit_logs where action in ('role_granted', 'role_revoked', 'sponsor_changed')) >= 5,
    'role and sponsor changes audited';
  raise notice 'PASS: audit trail';
end $$;
select pg_temp.expect_error($$delete from public.audit_logs$$, 'deleting audit logs (even as superuser)');

-- ---------------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
do $$ declare r public.attendance; begin
  r := public.check_in('00000000-0000-0000-0000-0000000000f1', 6.5561, 3.3921, 15);
  assert r.status = 'verified_in_office', 'inside radius → verified, got ' || r.status;
  assert r.check_in_distance_m < 100, 'distance recorded';
  raise notice 'PASS: verified check-in';
end $$;
select pg_temp.expect_error($$select public.check_in('00000000-0000-0000-0000-0000000000f1', 6.5561, 3.3921, 15)$$, 'double check-in');
select pg_temp.expect_error($$update public.attendance set status = 'verified_in_office'$$, 'direct attendance edit');
select public.check_out(6.5561, 3.3921, 12);
do $$ declare r public.attendance; begin
  r := public.check_in('00000000-0000-0000-0000-0000000000f1', 6.60, 3.45, 10);
  assert r.status = 'outside_radius', 'far away → outside_radius';
  perform public.check_out();
  r := public.check_in('00000000-0000-0000-0000-0000000000f1', null, null, null);
  assert r.status = 'location_unavailable', 'no coords → location_unavailable';
  perform public.check_out();
  r := public.check_in('00000000-0000-0000-0000-0000000000f1', 6.5568, 3.3928, 80);
  assert r.status = 'pending_review', 'borderline accuracy → pending_review, got ' || r.status;
  perform public.check_out();
  assert public.attendance_streak() = 1, 'streak counts today';
  raise notice 'PASS: outside radius / unavailable / pending review / streak';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect_error($$select public.check_in('00000000-0000-0000-0000-0000000000f1', 6.5561, 3.3921, 15)$$,
  'check-in at an office you are not assigned to');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
do $$ begin
  assert (select count(*) from public.attendance) = 0, 'member2 cannot see sponsor attendance';
  raise notice 'PASS: downline cannot see sponsor activity';
end $$;

-- Correction flow: member1 requests, member1 cannot approve own, leader approves.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
create temp table _corr as
  select (public.request_attendance_correction('00000000-0000-0000-0000-0000000000f1', current_date - 1,
          'Phone battery died at the office')).id as id;
grant select on _corr to authenticated;
select pg_temp.expect_error($$select public.review_attendance_correction((select id from _corr), true)$$, 'approve own correction');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
select public.review_attendance_correction((select id from _corr), true, 'Confirmed with office manager');
do $$ begin
  assert exists (select 1 from public.attendance where user_id = '00000000-0000-0000-0000-0000000000c1'
                 and attendance_date = current_date - 1 and status = 'approved_exception'), 'approved correction creates attendance';
  raise notice 'PASS: attendance correction approval';
end $$;

-- ---------------------------------------------------------------------------
-- Goals & evaluations
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.monthly_goals (user_id, month, income_target, sales_target, prospecting_target, status)
values (auth.uid(), date_trunc('month', current_date), 200000, 1000, 40, 'submitted');
select pg_temp.expect_error($$insert into public.monthly_goals (user_id, month, status)
  values (auth.uid(), (date_trunc('month', current_date) + interval '1 month')::date, 'approved')$$, 'self-approve goals');
select pg_temp.expect_error($$select public.review_goal((select id from public.monthly_goals where user_id = auth.uid()), 'approve')$$,
  'review own goals');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');  -- sponsor reviews
select public.review_goal((select id from public.monthly_goals where user_id = '00000000-0000-0000-0000-0000000000c1'),
  'approve', 'Strong plan', 'Book 3 presentations this week');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$update public.monthly_goals set income_target = 1 where user_id = auth.uid()$$, 'edit approved goals');
do $$ begin
  assert (select status from public.monthly_goals where user_id = auth.uid()) = 'approved', 'goal approved';
  assert exists (select 1 from public.notifications where user_id = auth.uid() and type = 'sponsor_feedback'), 'member notified';
  raise notice 'PASS: goal submission, review and lock';
end $$;

select pg_temp.expect_error($$insert into public.evaluations (user_id, period_date, prospects)
  values (auth.uid(), date_trunc('month', current_date)::date + 2, 5)$$, 'evaluation on a non-schedule date');
insert into public.evaluations (user_id, period_date, earnings, prospects, presentations, orders_generated)
values (auth.uid(), public.current_evaluation_period(current_date), 15000, 12, 3, 2);
insert into public.orders (member_id, amount, category, status) values (auth.uid(), 1500, 'Wellness', 'confirmed');

select pg_temp.act_as(null);
do $$ begin
  assert exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000000b1' and type = 'evaluation_completed'),
    'sponsor notified of evaluation';
  assert exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000000b1' and type = 'order_recorded'),
    'sponsor notified of order';
  assert exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-0000000000c1' and type = 'order_milestone'),
    'sales target milestone fired';
  assert (select max(d) from public.evaluation_dates('2027-02-11') d) = '2027-02-28', 'February ends on the 28th';
  assert (select count(*) from public.evaluation_dates('2027-02-11')) = 7, 'seven evaluation dates in February';
  assert public.current_evaluation_period('2026-10-17') = '2026-10-15', 'current period';
  raise notice 'PASS: evaluations, orders, milestones, schedule';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
do $$ declare p jsonb; begin
  p := public.goal_progress((select id from public.monthly_goals where user_id = auth.uid()));
  assert (p ->> 'income')::numeric = 15000 and (p ->> 'sales')::numeric = 1500 and (p ->> 'recruitment')::int = 1,
    'goal progress computed from activity: ' || p::text;
  raise notice 'PASS: goal progress %', p;
end $$;

-- Sponsor gives evaluation feedback; outsider cannot.
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
insert into public.evaluation_feedback (evaluation_id, author_id, comment)
select id, auth.uid(), 'Great follow-ups!' from public.evaluations where user_id = '00000000-0000-0000-0000-0000000000c1';
select pg_temp.act_as(null);
create temp table _ev as select id from public.evaluations where user_id = '00000000-0000-0000-0000-0000000000c1';
grant select on _ev to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect_error($$insert into public.evaluation_feedback (evaluation_id, author_id, comment)
  select id, auth.uid(), 'spam' from _ev$$, 'outsider writes evaluation feedback');

-- ---------------------------------------------------------------------------
-- Finance ledger
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
create temp table _tx as select (public.submit_transaction('deposit', 5000, 'savings', 'Monthly savings')).id as id;
grant select on _tx to authenticated;
select pg_temp.expect_error($$select public.submit_transaction('withdrawal', 100, 'savings')$$, 'withdraw unconfirmed funds');
select pg_temp.expect_error($$update public.financial_transactions set amount = 999999$$, 'edit ledger amount');
select pg_temp.expect_error($$select public.decide_transaction((select id from _tx), true)$$, 'member approves own payment');

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');  -- leader: no grant yet
do $$ begin
  assert (select count(*) from public.financial_transactions) = 0, 'leader cannot see finances without a grant';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.financial_access_grants (member_id, viewer_id) values (auth.uid(), '00000000-0000-0000-0000-0000000000a1');
select pg_temp.expect_error($$insert into public.financial_access_grants (member_id, viewer_id)
  values (auth.uid(), '00000000-0000-0000-0000-0000000000e1')$$, 'share finances with someone outside your upline');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  assert (select count(*) from public.financial_transactions) = 1, 'leader sees shared finances';
  raise notice 'PASS: explicit financial sharing';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');  -- sponsor without grant/permission
do $$ begin
  assert (select count(*) from public.financial_transactions) = 0, 'sponsor without permission sees nothing';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.decide_transaction((select id from _tx), true, 'Receipt verified');
select pg_temp.expect_error($$select public.decide_transaction((select id from _tx), false)$$, 'decide twice');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$select public.submit_transaction('withdrawal', 6000, 'savings')$$, 'withdraw more than balance');
select public.submit_transaction('withdrawal', 2000, 'savings', 'School fees');
do $$ declare b record; begin
  select * into b from public.financial_account_balances where user_id = auth.uid() and kind = 'savings';
  assert b.confirmed_balance = 5000 and b.pending_out = 2000, 'balance derived from ledger';
  raise notice 'PASS: ledger balances (confirmed %, pending out %)', b.confirmed_balance, b.pending_out;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select public.reverse_transaction((select id from _tx), 'Duplicate entry');
select pg_temp.expect_error($$select public.reverse_transaction((select id from _tx), 'again')$$, 'double reversal');
select pg_temp.act_as(null);
select pg_temp.expect_error($$delete from public.financial_transactions$$, 'deleting ledger rows (even as superuser)');
do $$ begin
  assert (select confirmed_balance from public.financial_account_balances
          where user_id = '00000000-0000-0000-0000-0000000000c1' and kind = 'savings') = 0, 'reversal nets to zero';
  raise notice 'PASS: reversal & immutability';
end $$;

-- ---------------------------------------------------------------------------
-- Announcements, AI privacy, analytics, reminders
-- ---------------------------------------------------------------------------
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$insert into public.announcements (author_id, title, body) values (auth.uid(), 'Hello all', 'Spam')$$,
  'member publishes org announcement');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.announcements (author_id, title, body, kind) values (auth.uid(), 'Director Seminar', 'Join us on Thursday.', 'training');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');  -- leader recognises team member
insert into public.announcements (author_id, kind, audience, recipient_id, title, body)
values (auth.uid(), 'recognition', 'team', '00000000-0000-0000-0000-0000000000c1', 'Mary hit her target!', 'Congratulations Mary 🎉');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  assert (select count(*) from public.announcements) = 1, 'outsider sees org-wide post, not team recognition';
  assert exists (select 1 from public.notifications where type = 'training_announcement'), 'announcement fanned out';
  raise notice 'PASS: announcement audiences';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.ai_conversations (id, title) values ('00000000-0000-0000-0000-0000000000cc', 'Private chat');
insert into public.ai_messages (conversation_id, role, content) values ('00000000-0000-0000-0000-0000000000cc', 'user', 'secret');
select pg_temp.expect_error($$insert into public.ai_memories (content) values ('I like mornings')$$, 'memory without consent');
update public.profiles set ai_memory_enabled = true where id = auth.uid();
insert into public.ai_memories (content) values ('Prefers morning prospecting');
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');  -- even super admin
do $$ begin
  assert (select count(*) from public.ai_messages) = 0, 'admins cannot read member AI conversations';
  assert (select count(*) from public.search_knowledge('evaluation')) >= 1, 'knowledge search works';
  raise notice 'PASS: AI privacy & retrieval';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
update public.profiles set ai_memory_enabled = false where id = auth.uid();
do $$ begin
  assert (select count(*) from public.ai_memories) = 0, 'disabling memory deletes it';
end $$;

select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  assert (select count(*) from public.team_member_stats()) = 3, 'leader stats cover 3 downlines';
  assert (select count(*) from public.team_growth(null, 3)) = 3, 'growth series';
  assert (select count(*) from public.upcoming_birthdays(0)) = 1, 'opted-in birthday today visible';
  raise notice 'PASS: team analytics & birthdays';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect_error($$select * from public.team_member_stats('00000000-0000-0000-0000-0000000000a1')$$, 'outsider reads leader team stats');
select pg_temp.expect_error($$select public.org_overview()$$, 'member reads org overview');
select pg_temp.expect_error($$select public.run_daily_reminders()$$, 'member triggers reminder job');

select pg_temp.act_as(null);
do $$ declare r jsonb; r2 jsonb; begin
  r := public.run_daily_reminders(public.current_evaluation_period(current_date));
  r2 := public.run_daily_reminders(public.current_evaluation_period(current_date));
  assert (r2 ->> 'evaluation_reminders')::int = 0 and (r2 ->> 'birthday_messages')::int = 0, 'reminders are idempotent';
  raise notice 'PASS: daily reminders % / rerun %', r, r2;
end $$;

-- Growth focus
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$ declare f jsonb; begin
  f := public.growth_focus();
  assert (f ->> 'directs')::int = 1 and (f ->> 'team_size')::int = 3, 'leader focus counts directs and team';
  assert (f -> 'areas' -> 0 ->> 'key') in ('duplication', 'recruiting', 'team_prospecting', 'prospecting'), 'most urgent area first';
  assert public.growth_focus('00000000-0000-0000-0000-0000000000d1') is not null, 'leader may see a downline focus';
  assert (select count(*) from public.team_focus()) = 3, 'team focus covers the branch';
  raise notice 'PASS: growth focus for leader';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$select public.growth_focus('00000000-0000-0000-0000-0000000000b1')$$, 'member reads sponsor growth focus');
select pg_temp.expect_error($$select public.run_weekly_growth_focus()$$, 'member triggers weekly focus job');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
select pg_temp.expect_error($$select * from public.team_focus('00000000-0000-0000-0000-0000000000a1')$$, 'outsider reads leader team focus');
select pg_temp.act_as(null);
update public.profiles set joined_at = now() - interval '10 days';
do $$ declare n int; n2 int; begin
  n := public.run_weekly_growth_focus();
  n2 := public.run_weekly_growth_focus();
  assert n > 0 and n2 = 0, 'weekly focus notifies once per week';
  raise notice 'PASS: weekly growth focus % / rerun %', n, n2;
end $$;

-- Prospects
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.prospects (full_name, phone, notes) values ('Pat Prospect', '2348012345678', 'Met at church');
insert into public.prospect_messages (prospect_id, direction, body)
  select id, 'out', 'Hi Pat, great meeting you!' from public.prospects where full_name = 'Pat Prospect';
do $$ begin
  assert (select count(*) from public.prospect_pipeline()) = 1, 'own pipeline';
  raise notice 'PASS: member manages own prospects';
end $$;
select pg_temp.expect_error($$insert into public.prospects (owner_id, full_name) values ('00000000-0000-0000-0000-0000000000b1', 'Spoof')$$, 'create prospect for someone else');
select pg_temp.expect_error($$select * from public.member_integrations$$, 'member reads integration tokens');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000b1');
do $$ begin
  assert (select count(*) from public.prospects) = 1, 'sponsor sees downline prospects';
  assert (select count(*) from public.prospect_messages) = 1, 'sponsor sees downline messages';
  update public.prospects set stage = 'joined';
  assert (select stage from public.prospects limit 1) = 'new', 'sponsor cannot change downline prospect';
  raise notice 'PASS: leader reads but cannot edit team prospects';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  assert (select count(*) from public.prospects) = 0, 'outsider sees no prospects';
  insert into public.bank_waitlist (interests) values ('{savings}');
  assert public.bank_waitlist_count() >= 1, 'waitlist count';
  raise notice 'PASS: prospect privacy & bank waitlist';
end $$;
select pg_temp.expect_error($$select * from public.prospect_pipeline('00000000-0000-0000-0000-0000000000c1')$$, 'outsider reads member pipeline');

-- Office tools
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$select qr_code from public.offices$$, 'member reads office QR secret');
select pg_temp.expect_error($$select public.office_qr_code('00000000-0000-0000-0000-0000000000f1')$$, 'member reads QR via function');
select pg_temp.expect_error($$select public.check_in_qr('wrong-code')$$, 'check in with an invalid QR code');
select pg_temp.act_as(null);
update public.attendance set check_out_at = coalesce(check_out_at, now());
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ declare v_code text; r public.attendance; begin
  v_code := public.office_qr_code('00000000-0000-0000-0000-0000000000f1');
  perform pg_temp.act_as(null);
  insert into public.office_memberships (office_id, user_id) values ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000d1') on conflict do nothing;
  perform pg_temp.act_as('00000000-0000-0000-0000-0000000000d1');
  r := public.check_in_qr(v_code);
  assert r.method = 'qr' and r.status = 'verified_in_office', 'QR check-in verified';
  r := public.check_out();
  perform pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
  assert (select count(*) from public.office_register('00000000-0000-0000-0000-0000000000f1')) >= 2, 'register lists members';
  assert (select count(*) from public.offices_overview()) = 1, 'admin overview';
  raise notice 'PASS: QR check-in, register and overview';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
select pg_temp.expect_error($$select public.mark_attendance('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000f1', current_date)$$, 'member marks themself present');
do $$ begin
  assert (select count(*) from public.offices_overview()) = 0, 'member sees no office overview';
  perform * from public.earnings_leaderboard('month');
  insert into public.checklist_checks (item_id, check_date) select id, current_date from public.checklist_items limit 2;
  assert (select count(*) from public.checklist_checks) = 2, 'checklist ticks';
  assert (select count(*) from public.daily_thoughts) >= 1, 'thought visible';
  raise notice 'PASS: leaderboard, checklist, thought of the day';
end $$;
select pg_temp.expect_error($$insert into public.checklist_checks (item_id, check_date) select id, current_date - 5 from public.checklist_items limit 1$$, 'tick an old checklist day');
select pg_temp.expect_error($$insert into public.checklist_items (title) values ('Hack')$$, 'member edits checklist items');

-- Keep inviting
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
do $$ declare f jsonb; begin
  f := public.growth_focus();
  assert exists (select 1 from jsonb_array_elements(f -> 'areas') a where a ->> 'key' = 'inviting'), 'inviting area present when few invites';
  raise notice 'PASS: inviting focus area';
end $$;
select pg_temp.expect_error($$select public.run_prospecting_nudges()$$, 'member triggers prospecting nudges');
select pg_temp.act_as(null);
do $$ declare n int; n2 int; begin
  n := public.run_prospecting_nudges();
  n2 := public.run_prospecting_nudges();
  assert n > 0 and n2 = 0, 'nudges sent once per window';
  assert not exists (select 1 from public.notifications where type = 'prospecting_nudge' and user_id = '00000000-0000-0000-0000-0000000000c1'), 'active prospector not nudged';
  raise notice 'PASS: prospecting nudges % / rerun %', n, n2;
end $$;

-- Send to sponsor / team leader
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
do $$ declare n int; begin
  assert (select id from public.my_leaders() where relation = 'sponsor') = '00000000-0000-0000-0000-0000000000b1', 'sponsor found';
  assert (select id from public.my_leaders() where relation = 'team_leader') = '00000000-0000-0000-0000-0000000000a1', 'office team leader found';
  n := public.share_with_leaders('plan', null, 'My plan', 'Call 10 people', array['sponsor', 'team_leader'], 'Please check');
  assert n = 2, 'sent to both';
  raise notice 'PASS: leaders resolved and plan shared';
end $$;
select pg_temp.expect_error($$select public.share_with_leaders('goal', gen_random_uuid(), 'x', 'y', array['sponsor'])$$, 'share someone else''s goal');
select pg_temp.expect_error($$insert into public.shared_items (sender_id, recipient_id, relation, kind, title, body) values (auth.uid(), auth.uid(), 'sponsor', 'plan', 'x', 'y')$$, 'insert shared item directly');
select pg_temp.act_as('00000000-0000-0000-0000-0000000000a1');
do $$ begin
  assert (select count(*) from public.shared_items where recipient_id = auth.uid()) = 1, 'team leader received it';
  raise notice 'PASS: team leader inbox';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
do $$ begin
  assert (select count(*) from public.shared_items) = 0, 'outsider sees nothing';
  raise notice 'PASS: shared items private';
end $$;

-- Complaints
select pg_temp.act_as('00000000-0000-0000-0000-0000000000c1');
insert into public.support_tickets (category, message, page) values ('payment', 'My deposit is still pending after a week', '/finance');
select pg_temp.expect_error($$insert into public.support_tickets (message, status) values ('trying to self-resolve', 'resolved')$$, 'member creates a resolved ticket');
do $$ begin
  update public.support_tickets set status = 'resolved';
  assert (select status from public.support_tickets limit 1) = 'open', 'member cannot resolve own ticket';
  raise notice 'PASS: member complaint';
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-0000000000e1');
do $$ begin assert (select count(*) from public.support_tickets) = 0, 'outsider sees no tickets'; raise notice 'PASS: tickets private'; end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  assert exists (select 1 from public.notifications where type = 'support_ticket'), 'admin notified';
  update public.support_tickets set status = 'resolved', admin_note = 'Confirmed today';
  raise notice 'PASS: admin handles complaint';
end $$;

\echo '=========================================='
\echo 'ALL SECURITY TESTS PASSED'
\echo '=========================================='
