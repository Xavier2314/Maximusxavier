-- =============================================================================
-- MAXIMUS — 0012 Office tools: QR check-in, lateness, leaderboard, daily
-- checklist, thought of the day, leader mark-present, all-offices overview
-- =============================================================================

alter type public.attendance_method add value if not exists 'qr';

-- Each office gets a secret code printed as a QR poster; managers can rotate it.
alter table public.offices
  add column if not exists qr_code text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  add column if not exists late_grace_minutes integer not null default 15 check (late_grace_minutes between 0 and 240);
create unique index if not exists offices_qr_code_idx on public.offices (qr_code);
-- Only managers may read the QR secret (through office_qr_code below).
revoke select on public.offices from anon, authenticated;
grant select (id, name, address, latitude, longitude, radius_m, timezone, schedule, manager_id, is_active,
              created_at, updated_at, late_grace_minutes) on public.offices to authenticated;

create or replace function public.office_qr_code(p_office uuid)
returns text language plpgsql stable security definer set search_path = public as $$
begin
  if not can_manage_office(p_office) then
    raise exception 'Only office managers can view the check-in QR code' using errcode = '42501';
  end if;
  return (select qr_code from offices where id = p_office);
end $$;

create or replace function public.rotate_office_qr(p_office uuid)
returns text language plpgsql security definer set search_path = public as $$
declare v_code text := encode(extensions.gen_random_bytes(12), 'hex');
begin
  if not can_manage_office(p_office) then
    raise exception 'Only office managers can rotate the QR code' using errcode = '42501';
  end if;
  update offices set qr_code = v_code where id = p_office;
  perform write_audit('office_qr_rotated', 'office', p_office::text, '{}'::jsonb);
  return v_code;
end $$;

-- Scanning the office poster checks the member in. The code proves they saw
-- the poster; if the phone also shares a location far from the office the
-- record goes to review instead.
create or replace function public.check_in_qr(
  p_code text, p_lat double precision default null, p_lng double precision default null,
  p_accuracy double precision default null
) returns public.attendance
language plpgsql security definer set search_path = public as $$
declare
  v_office offices%rowtype;
  v_dist   double precision;
  v_status attendance_status := 'verified_in_office';
  v_row    attendance;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_office from offices where qr_code = p_code and is_active;
  if not found then raise exception 'This QR code is not valid any more. Ask your office manager for the current one.'; end if;
  if not exists (select 1 from office_memberships where office_id = v_office.id and user_id = auth.uid()) then
    raise exception 'You are not assigned to this office' using errcode = '42501';
  end if;
  if exists (select 1 from attendance where user_id = auth.uid() and check_out_at is null) then
    raise exception 'You are already checked in. Check out first.';
  end if;
  if p_lat is not null and p_lng is not null and v_office.latitude is not null then
    v_dist := distance_m(p_lat, p_lng, v_office.latitude, v_office.longitude);
    if v_dist - coalesce(p_accuracy, 0) > v_office.radius_m then v_status := 'pending_review'; end if;
  end if;
  insert into attendance (user_id, office_id, attendance_date, status, method,
                          check_in_lat, check_in_lng, check_in_accuracy_m, check_in_distance_m)
  values (auth.uid(), v_office.id, (now() at time zone coalesce(v_office.timezone, 'Africa/Lagos'))::date,
          v_status, 'qr', p_lat, p_lng, p_accuracy, round(v_dist::numeric, 1))
  returning * into v_row;
  return v_row;
end $$;

-- Opening time for a date from the office schedule ({"mon":{"open":"08:00"}}).
-- Null when the office is closed that day; 09:00 when no schedule is set.
create or replace function public.office_open_time(p_office uuid, p_date date)
returns time language sql stable security definer set search_path = public as $$
  select case
    when o.schedule = '{}'::jsonb then case when extract(isodow from p_date) = 7 then null else time '09:00' end
    else (o.schedule -> lower(to_char(p_date, 'dy')) ->> 'open')::time
  end
  from offices o where o.id = p_office
$$;

-- Leader/manager marks a member present (e.g. they forgot to check in).
create or replace function public.mark_attendance(p_user uuid, p_office uuid, p_date date, p_note text default null)
returns public.attendance language plpgsql security definer set search_path = public as $$
declare v_row attendance; v_tz text; v_open time;
begin
  if not can_review_attendance(p_user, p_office) then
    raise exception 'You are not authorised to mark attendance for this member' using errcode = '42501';
  end if;
  if p_date > current_date + 1 then raise exception 'Cannot mark a future date'; end if;
  if exists (select 1 from attendance where user_id = p_user and attendance_date = p_date
             and status in ('verified_in_office', 'approved_exception')) then
    raise exception 'This member is already marked present for that day';
  end if;
  select timezone into v_tz from offices where id = p_office;
  v_open := coalesce(office_open_time(p_office, p_date), time '09:00');
  insert into attendance (user_id, office_id, attendance_date, check_in_at, check_out_at, status, method, note, reviewed_by)
  values (p_user, p_office, p_date, (p_date::timestamp + v_open) at time zone coalesce(v_tz, 'Africa/Lagos'),
          (p_date::timestamp + v_open) at time zone coalesce(v_tz, 'Africa/Lagos'),
          'approved_exception', 'admin', coalesce(nullif(trim(p_note), ''), 'Marked present by a leader'), auth.uid())
  returning * into v_row;
  perform write_audit('attendance_marked', 'attendance', v_row.id::text, jsonb_build_object('member', p_user, 'date', p_date));
  perform notify(p_user, 'attendance_update', 'Attendance marked',
                 'A leader marked you present for ' || to_char(p_date, 'FMDDth Mon') || '.', '/attendance', '{}'::jsonb);
  return v_row;
end $$;

-- The day's register for an office: who came on time, late, or not at all.
create or replace function public.office_register(p_office uuid, p_date date default null)
returns table (
  member uuid, full_name text, member_code text, avatar_url text,
  check_in_at timestamptz, check_out_at timestamptz, status text, minutes_late integer, attendance_status public.attendance_status
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_tz    text := coalesce((select timezone from offices where id = p_office), 'Africa/Lagos');
  v_date  date := coalesce(p_date, (now() at time zone v_tz)::date);
  v_open  time := office_open_time(p_office, v_date);
  v_grace int := coalesce((select late_grace_minutes from offices where id = p_office), 15);
  v_all   boolean := can_manage_office(p_office);
begin
  return query
  select p.id, p.full_name, p.member_id, p.avatar_url, a.check_in_at, a.check_out_at,
    case
      when a.id is null then case when v_open is null then 'off_day' else 'absent' end
      when a.status in ('outside_radius', 'rejected') then 'not_verified'
      when a.status = 'pending_review' then 'pending'
      when v_open is null then 'present'
      when (a.check_in_at at time zone v_tz)::time > v_open + make_interval(mins => v_grace) then 'late'
      else 'on_time'
    end,
    case when a.id is not null and v_open is not null
      then greatest(0, (extract(epoch from ((a.check_in_at at time zone v_tz)::time - v_open)) / 60)::int) end,
    a.status
  from office_memberships om
  join profiles p on p.id = om.user_id and p.status = 'active'
  left join lateral (
    select * from attendance x where x.user_id = om.user_id and x.office_id = p_office and x.attendance_date = v_date
    order by x.check_in_at limit 1) a on true
  where om.office_id = p_office and (v_all or can_view_team_data(om.user_id))
  order by a.check_in_at nulls last, p.full_name;
end $$;

-- -----------------------------------------------------------------------------
-- Earnings leaderboard (from evaluations). Admins choose whether members see
-- amounts or only the ranking.
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('leaderboard', jsonb_build_object('show_amounts', true))
on conflict (key) do nothing;

create or replace function public.earnings_leaderboard(p_period text default 'month', p_office uuid default null, p_limit integer default 20)
returns table (rank integer, member uuid, full_name text, avatar_url text, office_name text,
               earnings numeric, prospects integer, is_me boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  v_today date := (now() at time zone 'Africa/Lagos')::date;
  v_from  date := case when p_period = 'week' then date_trunc('week', v_today)::date else date_trunc('month', v_today)::date end;
  v_show  boolean := coalesce((select (value ->> 'show_amounts')::boolean from app_settings where key = 'leaderboard'), true)
                     or has_permission('view_org_analytics');
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  return query
  with totals as (
    select e.user_id, sum(e.earnings) as earn, sum(e.prospects)::int as pros
    from evaluations e
    join profiles p on p.id = e.user_id and p.status = 'active'
    where e.period_date >= v_from and e.period_date <= v_today
      and (p_office is null or p.office_id = p_office)
    group by e.user_id
    having sum(e.earnings) > 0
  )
  select (row_number() over (order by t.earn desc, t.pros desc))::int, p.id, p.full_name, p.avatar_url, o.name,
         case when v_show or p.id = auth.uid() then t.earn end, t.pros, p.id = auth.uid()
  from totals t join profiles p on p.id = t.user_id left join offices o on o.id = p.office_id
  order by t.earn desc, t.pros desc
  limit greatest(1, least(p_limit, 100));
end $$;

-- -----------------------------------------------------------------------------
-- Daily checklist
-- -----------------------------------------------------------------------------
create table public.checklist_items (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (length(trim(title)) between 2 and 120),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.checklist_checks (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  item_id    uuid not null references public.checklist_items (id) on delete cascade,
  check_date date not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, item_id, check_date)
);
alter table public.checklist_items enable row level security;
alter table public.checklist_checks enable row level security;
create policy checklist_items_read on public.checklist_items for select to authenticated using (true);
create policy checklist_items_write on public.checklist_items for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));
create policy checklist_checks_read on public.checklist_checks for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy checklist_checks_own on public.checklist_checks for insert to authenticated
  with check (user_id = auth.uid() and check_date between current_date - 1 and current_date + 1);
create policy checklist_checks_uncheck on public.checklist_checks for delete to authenticated
  using (user_id = auth.uid());

insert into public.checklist_items (title, sort_order) values
  ('Check in at the office', 1),
  ('Contact 10 new prospects', 2),
  ('Follow up with 5 prospects', 3),
  ('Do one presentation', 4),
  ('Learn something in the Academy', 5),
  ('Support one team member', 6);

-- -----------------------------------------------------------------------------
-- Thought of the day
-- -----------------------------------------------------------------------------
create table public.daily_thoughts (
  id         uuid primary key default gen_random_uuid(),
  body       text not null check (length(trim(body)) between 5 and 500),
  author     text check (length(author) <= 120),
  show_on    date not null unique,
  created_at timestamptz not null default now()
);
alter table public.daily_thoughts enable row level security;
create policy daily_thoughts_read on public.daily_thoughts for select to authenticated using (show_on <= current_date + 1);
create policy daily_thoughts_write on public.daily_thoughts for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));

insert into public.daily_thoughts (body, author, show_on) values
  ('The secret of getting ahead is getting started.', 'Mark Twain', current_date),
  ('Success is the sum of small efforts, repeated day in and day out.', 'Robert Collier', current_date + 1)
on conflict (show_on) do nothing;

-- -----------------------------------------------------------------------------
-- All offices at a glance (admins see every office; managers see their own)
-- -----------------------------------------------------------------------------
create or replace function public.offices_overview()
returns table (
  office uuid, name text, members integer, present_today integer, late_today integer,
  attendance_rate_7d integer, month_earnings numeric, new_members_month integer
)
language plpgsql stable security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Africa/Lagos')::date;
begin
  return query
  select o.id, o.name,
    (select count(*)::int from office_memberships m join profiles p on p.id = m.user_id and p.status = 'active' where m.office_id = o.id),
    (select count(*)::int from office_register(o.id, v_today) r where r.status in ('on_time', 'late', 'present')),
    (select count(*)::int from office_register(o.id, v_today) r where r.status = 'late'),
    (select case when count(*) = 0 then 0 else
       round(100.0 * count(*) filter (where a.status in ('verified_in_office', 'approved_exception')) / count(*))::int end
     from office_memberships m
     cross join generate_series(v_today - 6, v_today, interval '1 day') d
     left join lateral (select x.status from attendance x where x.user_id = m.user_id and x.attendance_date = d::date limit 1) a on true
     where m.office_id = o.id and office_open_time(o.id, d::date) is not null),
    (select coalesce(sum(e.earnings), 0) from evaluations e join profiles p on p.id = e.user_id
      where p.office_id = o.id and e.period_date >= date_trunc('month', v_today)::date),
    (select count(*)::int from profiles p where p.office_id = o.id and p.joined_at >= date_trunc('month', v_today))
  from offices o
  where o.is_active and can_manage_office(o.id)
  order by o.name;
end $$;

do $do$
declare f text;
begin
  foreach f in array array[
    'office_qr_code(uuid)', 'rotate_office_qr(uuid)', 'check_in_qr(text, double precision, double precision, double precision)',
    'office_open_time(uuid, date)', 'mark_attendance(uuid, uuid, date, text)', 'office_register(uuid, date)',
    'earnings_leaderboard(text, uuid, integer)', 'offices_overview()']
  loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end
$do$;
