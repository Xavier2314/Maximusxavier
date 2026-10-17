-- =============================================================================
-- MAXIMUS — 0002 Offices & Smart Attendance
-- GPS check-in compares the reported browser location with the office's
-- registered coordinates. A "verified" status means the reported coordinates
-- were inside the radius — it does NOT prove physical presence in a building.
-- =============================================================================

create table public.office_memberships (
  office_id   uuid not null references public.offices (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  is_manager  boolean not null default false,
  assigned_by uuid references public.profiles (id) on delete set null,
  assigned_at timestamptz not null default now(),
  primary key (office_id, user_id)
);
create index office_memberships_user_idx on public.office_memberships (user_id);

-- Registration puts a member in their chosen office automatically.
create or replace function public.profiles_sync_office_membership() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.office_id is not null then
    insert into office_memberships (office_id, user_id) values (new.office_id, new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger profiles_office_membership after insert or update of office_id on public.profiles
  for each row execute function public.profiles_sync_office_membership();

create or replace function public.can_manage_office(p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_permission('view_org_analytics')
      or (public.has_permission('manage_office') and (
            exists (select 1 from public.offices where id = p_office and manager_id = auth.uid())
         or exists (select 1 from public.office_memberships
                    where office_id = p_office and user_id = auth.uid() and is_manager)))
$$;

-- Replace the broad office write policy from 0001 with scoped ones.
drop policy offices_write on public.offices;
create policy offices_insert on public.offices for insert to authenticated
  with check (public.has_permission('view_org_analytics') and public.has_permission('manage_office'));
create policy offices_update on public.offices for update to authenticated
  using (public.can_manage_office(id)) with check (public.can_manage_office(id));
create policy offices_delete on public.offices for delete to authenticated
  using (public.has_permission('view_org_analytics') and public.has_permission('manage_office'));

alter table public.office_memberships enable row level security;
create policy office_memberships_read on public.office_memberships for select to authenticated
  using (user_id = auth.uid() or public.can_manage_office(office_id) or public.can_view_team_data(user_id));
create policy office_memberships_write on public.office_memberships for all to authenticated
  using (public.can_manage_office(office_id)) with check (public.can_manage_office(office_id));

-- -----------------------------------------------------------------------------
-- Attendance
-- -----------------------------------------------------------------------------
create type public.attendance_status as enum (
  'verified_in_office',   -- reported coordinates inside the office radius
  'outside_radius',       -- reported coordinates clearly outside the radius
  'location_unavailable', -- member declined / device could not provide location
  'pending_review',       -- borderline accuracy, or awaiting a manager decision
  'approved_exception',   -- a manager approved a correction request
  'rejected'              -- a manager rejected the check-in
);
create type public.attendance_method as enum ('gps', 'manual', 'admin');

create table public.attendance (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  office_id           uuid not null references public.offices (id) on delete restrict,
  attendance_date     date not null,
  check_in_at         timestamptz not null default now(),
  check_out_at        timestamptz,
  status              public.attendance_status not null,
  method              public.attendance_method not null default 'gps',
  check_in_lat        double precision,
  check_in_lng        double precision,
  check_in_accuracy_m double precision check (check_in_accuracy_m is null or check_in_accuracy_m >= 0),
  check_in_distance_m double precision,
  check_out_lat       double precision,
  check_out_lng       double precision,
  check_out_accuracy_m double precision,
  check_out_distance_m double precision,
  note                text check (length(note) <= 500),
  reviewed_by         uuid references public.profiles (id) on delete set null,
  created_at          timestamptz not null default now(),
  constraint attendance_checkout_after_checkin check (check_out_at is null or check_out_at >= check_in_at)
);
create index attendance_user_date_idx on public.attendance (user_id, attendance_date desc);
create index attendance_office_date_idx on public.attendance (office_id, attendance_date desc);
-- Only one open (not yet checked out) record per member.
create unique index attendance_one_open_per_user on public.attendance (user_id) where check_out_at is null;

create table public.attendance_corrections (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete cascade,
  attendance_id       uuid references public.attendance (id) on delete cascade,
  office_id           uuid not null references public.offices (id) on delete cascade,
  requested_date      date not null,
  requested_check_in  timestamptz,
  requested_check_out timestamptz,
  reason              text not null check (length(trim(reason)) between 5 and 1000),
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewer_id         uuid references public.profiles (id) on delete set null,
  reviewer_note       text,
  reviewed_at         timestamptz,
  created_at          timestamptz not null default now()
);
create index attendance_corrections_status_idx on public.attendance_corrections (status, created_at desc);
create index attendance_corrections_user_idx on public.attendance_corrections (user_id);

-- Great-circle distance in metres.
create or replace function public.distance_m(lat1 double precision, lng1 double precision,
                                             lat2 double precision, lng2 double precision)
returns double precision language sql immutable as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  ))
$$;

create or replace function public.check_in(
  p_office uuid, p_lat double precision default null, p_lng double precision default null,
  p_accuracy double precision default null, p_note text default null
) returns public.attendance
language plpgsql security definer set search_path = public as $$
declare
  v_office  offices%rowtype;
  v_dist    double precision;
  v_status  attendance_status;
  v_row     attendance;
  v_tz      text;
begin
  if auth.uid() is null then raise exception 'Not signed in' using errcode = '42501'; end if;
  select * into v_office from offices where id = p_office and is_active;
  if not found then raise exception 'Office not found'; end if;
  if not exists (select 1 from office_memberships where office_id = p_office and user_id = auth.uid()) then
    raise exception 'You are not assigned to this office' using errcode = '42501';
  end if;
  if exists (select 1 from attendance where user_id = auth.uid() and check_out_at is null) then
    raise exception 'You are already checked in. Check out first.';
  end if;

  if p_lat is null or p_lng is null or v_office.latitude is null then
    v_status := 'location_unavailable';
  else
    v_dist := distance_m(p_lat, p_lng, v_office.latitude, v_office.longitude);
    if v_dist <= v_office.radius_m and coalesce(p_accuracy, 0) <= greatest(v_office.radius_m, 100) then
      v_status := 'verified_in_office';
    elsif v_dist - coalesce(p_accuracy, 0) <= v_office.radius_m then
      -- The accuracy circle overlaps the office radius: cannot decide automatically.
      v_status := 'pending_review';
    else
      v_status := 'outside_radius';
    end if;
  end if;

  v_tz := coalesce(v_office.timezone, 'Africa/Lagos');
  insert into attendance (user_id, office_id, attendance_date, status, method,
                          check_in_lat, check_in_lng, check_in_accuracy_m, check_in_distance_m, note)
  values (auth.uid(), p_office, (now() at time zone v_tz)::date, v_status, 'gps',
          p_lat, p_lng, p_accuracy, round(v_dist::numeric, 1), nullif(trim(p_note), ''))
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.check_out(
  p_lat double precision default null, p_lng double precision default null, p_accuracy double precision default null
) returns public.attendance
language plpgsql security definer set search_path = public as $$
declare v_row attendance; v_office offices%rowtype;
begin
  select * into v_row from attendance where user_id = auth.uid() and check_out_at is null for update;
  if not found then raise exception 'You are not checked in'; end if;
  select * into v_office from offices where id = v_row.office_id;
  update attendance set
    check_out_at = now(),
    check_out_lat = p_lat, check_out_lng = p_lng, check_out_accuracy_m = p_accuracy,
    check_out_distance_m = case when p_lat is not null and v_office.latitude is not null
      then round(distance_m(p_lat, p_lng, v_office.latitude, v_office.longitude)::numeric, 1) end
  where id = v_row.id
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.request_attendance_correction(
  p_office uuid, p_date date, p_reason text,
  p_check_in timestamptz default null, p_check_out timestamptz default null, p_attendance uuid default null
) returns public.attendance_corrections
language plpgsql security definer set search_path = public as $$
declare v_row attendance_corrections;
begin
  if not exists (select 1 from office_memberships where office_id = p_office and user_id = auth.uid()) then
    raise exception 'You are not assigned to this office' using errcode = '42501';
  end if;
  if p_attendance is not null and not exists (select 1 from attendance where id = p_attendance and user_id = auth.uid()) then
    raise exception 'Attendance record not found';
  end if;
  if p_date > current_date then raise exception 'Cannot request a correction for a future date'; end if;
  insert into attendance_corrections (user_id, attendance_id, office_id, requested_date,
                                      requested_check_in, requested_check_out, reason)
  values (auth.uid(), p_attendance, p_office, p_date, p_check_in, p_check_out, p_reason)
  returning * into v_row;
  return v_row;
end $$;

create or replace function public.can_review_attendance(p_user uuid, p_office uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select p_user <> auth.uid() and (
    public.can_manage_office(p_office)
    or (public.has_permission('approve_attendance_exceptions') and public.can_view_team_data(p_user))
  )
$$;

create or replace function public.review_attendance_correction(p_id uuid, p_approve boolean, p_note text default null)
returns public.attendance_corrections
language plpgsql security definer set search_path = public as $$
declare v_c attendance_corrections; v_tz text;
begin
  select * into v_c from attendance_corrections where id = p_id for update;
  if not found then raise exception 'Correction request not found'; end if;
  if v_c.status <> 'pending' then raise exception 'This request has already been reviewed'; end if;
  if not can_review_attendance(v_c.user_id, v_c.office_id) then
    raise exception 'You are not authorised to review this request' using errcode = '42501';
  end if;

  if p_approve then
    if v_c.attendance_id is not null then
      update attendance set
        status = 'approved_exception',
        check_in_at = coalesce(v_c.requested_check_in, check_in_at),
        check_out_at = coalesce(v_c.requested_check_out, check_out_at),
        reviewed_by = auth.uid()
      where id = v_c.attendance_id;
    else
      select timezone into v_tz from offices where id = v_c.office_id;
      insert into attendance (user_id, office_id, attendance_date, check_in_at, check_out_at,
                              status, method, note, reviewed_by)
      values (v_c.user_id, v_c.office_id, v_c.requested_date,
              coalesce(v_c.requested_check_in, (v_c.requested_date::timestamp + time '09:00') at time zone coalesce(v_tz, 'Africa/Lagos')),
              coalesce(v_c.requested_check_out, (v_c.requested_date::timestamp + time '17:00') at time zone coalesce(v_tz, 'Africa/Lagos')),
              'approved_exception', 'manual', 'Approved correction: ' || v_c.reason, auth.uid());
    end if;
  end if;

  update attendance_corrections set
    status = case when p_approve then 'approved' else 'rejected' end,
    reviewer_id = auth.uid(), reviewer_note = nullif(trim(p_note), ''), reviewed_at = now()
  where id = p_id returning * into v_c;

  -- notify() is defined in migration 0003; plpgsql resolves it at call time.
  perform notify(v_c.user_id, 'attendance_update',
    case when p_approve then 'Attendance correction approved' else 'Attendance correction declined' end,
    coalesce(nullif(trim(p_note), ''), to_char(v_c.requested_date, 'FMDDth Mon')), '/attendance',
    jsonb_build_object('correction_id', p_id));
  perform write_audit(case when p_approve then 'attendance_correction_approved' else 'attendance_correction_rejected' end,
                      'attendance_correction', p_id::text, jsonb_build_object('member', v_c.user_id));
  return v_c;
end $$;

-- Consecutive attended working days ending today (or the last working day).
-- Working days come from the office schedule keys (mon..sun); if no schedule
-- is set, Monday–Saturday are treated as working days.
create or replace function public.attendance_streak(p_user uuid default null)
returns integer language plpgsql stable security definer set search_path = public as $$
declare
  v_user    uuid := coalesce(p_user, auth.uid());
  v_sched   jsonb;
  v_tz      text;
  v_day     date;
  v_streak  integer := 0;
  v_dow     text;
  v_working boolean;
  v_present boolean;
begin
  if v_user <> auth.uid() and not can_view_team_data(v_user) then return null; end if;
  select o.schedule, o.timezone into v_sched, v_tz
  from profiles p left join offices o on o.id = p.office_id where p.id = v_user;
  v_day := (now() at time zone coalesce(v_tz, 'Africa/Lagos'))::date;

  for i in 0..400 loop
    v_dow := lower(to_char(v_day, 'Dy'));
    v_working := case when v_sched is null or v_sched = '{}'::jsonb then v_dow <> 'sun' else v_sched ? v_dow end;
    if v_working then
      v_present := exists (select 1 from attendance where user_id = v_user and attendance_date = v_day
                           and status in ('verified_in_office', 'approved_exception'));
      if v_present then
        v_streak := v_streak + 1;
      elsif i > 0 then
        exit;  -- a missed working day ends the streak (today may still be in progress)
      end if;
    end if;
    v_day := v_day - 1;
  end loop;
  return v_streak;
end $$;

alter table public.attendance enable row level security;
alter table public.attendance_corrections enable row level security;

create policy attendance_read on public.attendance for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id) or public.can_manage_office(office_id));
-- All writes happen through the functions above.
revoke insert, update, delete on public.attendance from authenticated, anon;

create policy attendance_corrections_read on public.attendance_corrections for select to authenticated
  using (user_id = auth.uid() or public.can_review_attendance(user_id, office_id));
revoke insert, update, delete on public.attendance_corrections from authenticated, anon;
