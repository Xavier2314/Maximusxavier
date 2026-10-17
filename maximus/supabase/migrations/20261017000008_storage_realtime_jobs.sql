-- =============================================================================
-- MAXIMUS — 0008 Storage, Realtime, Scheduled Reminders & Team Analytics
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Storage buckets & policies (skipped automatically outside Supabase)
-- -----------------------------------------------------------------------------
do $do$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('avatars',  'avatars',  true,  2097152,  array['image/jpeg', 'image/png', 'image/webp']),
      ('receipts', 'receipts', false, 5242880,  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
      ('academy',  'academy',  true,  52428800, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'video/mp4'])
    on conflict (id) do nothing;

    -- Avatars: public read; members write only inside their own folder.
    execute $p$create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars')$p$;
    execute $p$create policy "avatars own write" on storage.objects for insert to authenticated
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "avatars own update" on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "avatars own delete" on storage.objects for delete to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)$p$;

    -- Receipts: private. Owner uploads to their folder; finance viewers can read.
    execute $p$create policy "receipts own upload" on storage.objects for insert to authenticated
      with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text)$p$;
    execute $p$create policy "receipts authorised read" on storage.objects for select to authenticated
      using (bucket_id = 'receipts' and public.can_view_finance(((storage.foldername(name))[1])::uuid))$p$;

    -- Academy media: public read; content managers write.
    execute $p$create policy "academy public read" on storage.objects for select using (bucket_id = 'academy')$p$;
    execute $p$create policy "academy managers write" on storage.objects for all to authenticated
      using (bucket_id = 'academy' and public.has_permission('manage_content'))
      with check (bucket_id = 'academy' and public.has_permission('manage_content'))$p$;
  end if;
end
$do$;

-- -----------------------------------------------------------------------------
-- Realtime: live notification badge and live office attendance board.
-- -----------------------------------------------------------------------------
do $do$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.notifications, public.attendance;
  end if;
end
$do$;

-- -----------------------------------------------------------------------------
-- Daily reminders. Called once a day by the server cron route using the
-- service role. Idempotent: running it twice on the same day sends nothing new.
-- -----------------------------------------------------------------------------
create or replace function public.already_notified_today(p_user uuid, p_type text, p_key text)
returns boolean language sql stable as $$
  select exists (select 1 from public.notifications
                 where user_id = p_user and type = p_type and data ->> 'key' = p_key
                   and created_at >= date_trunc('day', now()))
$$;

create or replace function public.run_daily_reminders(p_today date default current_date)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_period      date := current_evaluation_period(p_today);
  v_eval_count  integer := 0;
  v_goal_count  integer := 0;
  v_bday_count  integer := 0;
  v_anniv_count integer := 0;
  v_next_month  date := (date_trunc('month', p_today) + interval '1 month')::date;
  v_day         integer := extract(day from p_today)::int;
  r             record;
begin
  -- 1. Evaluation reminders: on the evaluation day and two days later, for
  --    members who have not yet submitted for the current period.
  if p_today - v_period in (0, 2) then
    for r in
      select p.id from profiles p
      where p.status = 'active'
        and not exists (select 1 from evaluations e where e.user_id = p.id and e.period_date = v_period)
        and not already_notified_today(p.id, 'evaluation_reminder', v_period::text)
    loop
      perform notify(r.id, 'evaluation_reminder',
        case when p_today = v_period then 'Evaluation day 📋' else 'Your evaluation is still open' end,
        'Complete your ' || to_char(v_period, 'FMDDth Mon') || ' evaluation — it takes about 3 minutes.',
        '/evaluations/new', jsonb_build_object('key', v_period::text, 'period', v_period));
      v_eval_count := v_eval_count + 1;
    end loop;
  end if;

  -- 2. Goal-setting window: 10th, 12th and 15th of every month.
  if v_day in (10, 12, 15) then
    for r in
      select p.id,
             exists (select 1 from monthly_goals g where g.user_id = p.id and g.month = v_next_month
                     and g.status in ('submitted', 'approved')) as has_next
      from profiles p
      where p.status = 'active'
        and not already_notified_today(p.id, 'goal_reminder', v_next_month::text)
    loop
      perform notify(r.id, 'goal_reminder',
        case when r.has_next then 'Review your monthly goals' else 'Time to set your goals 🎯' end,
        case when r.has_next then 'Check your progress and adjust your plan for ' || to_char(v_next_month, 'FMMonth') || '.'
             else 'Goal-setting is open until the 15th. Set your targets for ' || to_char(v_next_month, 'FMMonth') || '.' end,
        '/goals', jsonb_build_object('key', v_next_month::text));
      v_goal_count := v_goal_count + 1;
    end loop;
  end if;

  -- 3. Birthdays (opted-in members only): the celebrant, their sponsor and direct team.
  for r in
    select p.id, p.full_name, p.sponsor_id from profiles p
    where p.status = 'active' and p.birthday_visibility <> 'private' and p.date_of_birth is not null
      and extract(month from p.date_of_birth) = extract(month from p_today)
      and (extract(day from p.date_of_birth) = v_day
           -- 29 Feb birthdays on 28 Feb in non-leap years
           or (extract(month from p.date_of_birth) = 2 and extract(day from p.date_of_birth) = 29 and v_day = 28
               and extract(day from (date_trunc('month', p_today) + interval '1 month - 1 day')) = 28))
  loop
    if not already_notified_today(r.id, 'birthday', 'self') then
      perform notify(r.id, 'birthday', 'Happy birthday, ' || split_part(r.full_name, ' ', 1) || '! 🎂',
                     'The whole Maximus family celebrates you today.', '/recognition', jsonb_build_object('key', 'self'));
      v_bday_count := v_bday_count + 1;
    end if;
    perform notify(x.uid, 'birthday', 'Birthday today 🎉', 'Wish ' || r.full_name || ' a happy birthday!', '/recognition',
                   jsonb_build_object('key', r.id::text, 'member_id', r.id))
    from (select r.sponsor_id as uid union select id from profiles where sponsor_id = r.id and status = 'active') x
    where x.uid is not null and not already_notified_today(x.uid, 'birthday', r.id::text);
  end loop;

  -- 4. Membership anniversaries.
  for r in
    select p.id, extract(year from age(p_today, p.joined_at::date))::int as years from profiles p
    where p.status = 'active'
      and extract(month from p.joined_at) = extract(month from p_today)
      and extract(day from p.joined_at) = v_day
      and p.joined_at::date < p_today
      and not already_notified_today(p.id, 'anniversary', 'self')
  loop
    perform notify(r.id, 'anniversary', 'Happy Maximus anniversary! 🏆',
                   r.years || ' year' || case when r.years = 1 then '' else 's' end || ' of growth. Thank you for being part of the journey.',
                   '/recognition', jsonb_build_object('key', 'self'));
    v_anniv_count := v_anniv_count + 1;
  end loop;

  return jsonb_build_object('date', p_today, 'evaluation_reminders', v_eval_count, 'goal_reminders', v_goal_count,
                            'birthday_messages', v_bday_count, 'anniversaries', v_anniv_count);
end $$;
revoke execute on function public.run_daily_reminders(date) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Team analytics
-- -----------------------------------------------------------------------------
-- Per-member activity over a window, plus an "is_active" flag computed from the
-- admin-configurable definition in app_settings.active_member_definition.
create or replace function public.team_member_stats(p_root uuid default null, p_max_depth integer default null)
returns table (
  member uuid, full_name text, member_code text, avatar_url text, office_name text, depth integer,
  sponsor_id uuid, joined_at timestamptz, status public.member_status,
  attendance_days integer, prospects integer, orders integer, sales numeric, evaluations integer,
  last_activity timestamptz, is_active boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_root uuid := coalesce(p_root, auth.uid());
  d jsonb := (select value from app_settings where key = 'active_member_definition');
  v_from date := current_date - coalesce((d ->> 'window_days')::int, 30);
begin
  if not can_view_team_data(v_root) then
    raise exception 'You are not authorised to view this team' using errcode = '42501';
  end if;
  return query
  with members as (
    select tr.descendant_id as id, tr.depth from team_relationships tr
    where tr.ancestor_id = v_root and tr.depth >= 1
      and (p_max_depth is null or tr.depth <= p_max_depth)
      and can_view_team_data(tr.descendant_id)
  ),
  stats as (
    select m.id, m.depth,
      (select count(distinct a.attendance_date) from attendance a where a.user_id = m.id and a.attendance_date >= v_from
         and a.status in ('verified_in_office', 'approved_exception'))::int as att,
      (select coalesce(sum(e.prospects), 0) from evaluations e where e.user_id = m.id and e.period_date >= v_from)::int as pros,
      (select count(*) from orders o where o.member_id = m.id and o.order_date >= v_from and o.status <> 'cancelled')::int as ord,
      (select coalesce(sum(o.amount), 0) from orders o where o.member_id = m.id and o.order_date >= v_from and o.status <> 'cancelled') as sal,
      (select count(*) from evaluations e where e.user_id = m.id and e.period_date >= v_from)::int as evs,
      greatest(
        (select max(a.check_in_at) from attendance a where a.user_id = m.id),
        (select max(e.submitted_at) from evaluations e where e.user_id = m.id),
        (select max(o.created_at) from orders o where o.member_id = m.id)) as last_act
    from members m
  )
  select p.id, p.full_name, p.member_id, p.avatar_url, o.name, s.depth, p.sponsor_id, p.joined_at, p.status,
         s.att, s.pros, s.ord, s.sal, s.evs, s.last_act,
         p.status = 'active' and case when coalesce((d ->> 'require_all')::boolean, false) then
              s.att >= coalesce((d ->> 'min_attendance_days')::int, 0)
          and s.pros >= coalesce((d ->> 'min_prospects')::int, 0)
          and s.ord >= coalesce((d ->> 'min_orders')::int, 0)
          and s.evs >= coalesce((d ->> 'min_evaluations')::int, 0)
         else
              (coalesce((d ->> 'min_attendance_days')::int, 0) > 0 and s.att >= (d ->> 'min_attendance_days')::int)
           or (coalesce((d ->> 'min_prospects')::int, 0) > 0 and s.pros >= (d ->> 'min_prospects')::int)
           or (coalesce((d ->> 'min_orders')::int, 0) > 0 and s.ord >= (d ->> 'min_orders')::int)
           or (coalesce((d ->> 'min_evaluations')::int, 0) > 0 and s.evs >= (d ->> 'min_evaluations')::int)
         end
  from stats s
  join profiles p on p.id = s.id
  left join offices o on o.id = p.office_id
  order by s.depth, p.full_name;
end $$;

-- Monthly new registrations in a member's team, for growth charts.
create or replace function public.team_growth(p_root uuid default null, p_months integer default 12)
returns table (month date, new_members integer, total_members integer)
language plpgsql stable security definer set search_path = public as $$
declare v_root uuid := coalesce(p_root, auth.uid());
begin
  if not can_view_team_data(v_root) then
    raise exception 'You are not authorised to view this team' using errcode = '42501';
  end if;
  return query
  with months as (
    select generate_series(date_trunc('month', current_date) - make_interval(months => greatest(p_months, 1) - 1),
                           date_trunc('month', current_date), interval '1 month')::date as m
  ),
  team as (
    select p.joined_at from team_relationships tr join profiles p on p.id = tr.descendant_id
    where tr.ancestor_id = v_root and tr.depth >= 1
  )
  select ms.m,
         (select count(*) from team t where t.joined_at >= ms.m and t.joined_at < ms.m + interval '1 month')::int,
         (select count(*) from team t where t.joined_at < ms.m + interval '1 month')::int
  from months ms order by ms.m;
end $$;

-- Organisation-wide headline numbers for the admin dashboard.
create or replace function public.org_overview()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if not has_permission('view_org_analytics') then
    raise exception 'You are not authorised to view organisation analytics' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'members_total',    (select count(*) from profiles),
    'members_active',   (select count(*) from profiles where status = 'active'),
    'new_this_month',   (select count(*) from profiles where joined_at >= date_trunc('month', now())),
    'checked_in_today', (select count(distinct user_id) from attendance where attendance_date = v_today
                         and status in ('verified_in_office', 'approved_exception')),
    'present_now',      (select count(*) from attendance where check_out_at is null and attendance_date = v_today
                         and status in ('verified_in_office', 'approved_exception')),
    'pending_payments', (select count(*) from financial_transactions where status = 'pending'),
    'pending_corrections', (select count(*) from attendance_corrections where status = 'pending'),
    'confirmed_savings', (select coalesce(sum(t.direction * t.amount), 0) from financial_transactions t
                          join financial_accounts a on a.id = t.account_id where a.kind = 'savings' and t.status = 'confirmed'),
    'confirmed_contributions', (select coalesce(sum(t.direction * t.amount), 0) from financial_transactions t
                          join financial_accounts a on a.id = t.account_id where a.kind = 'contributions' and t.status = 'confirmed'),
    'sales_this_month', (select coalesce(sum(amount), 0) from orders where status <> 'cancelled'
                         and order_date >= date_trunc('month', current_date)),
    'evaluations_current_period', (select count(*) from evaluations where period_date = current_evaluation_period(v_today))
  );
end $$;
