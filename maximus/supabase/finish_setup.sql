-- =============================================================================
-- MAXIMUS — finish database setup (one paste)
-- Paste this whole file into Supabase → SQL Editor → Run.
-- It contains the remaining parts of migrations 0001–0008 (the first parts
-- were already applied). It runs as one transaction: all or nothing.
-- =============================================================================
begin;
create or replace function public.profiles_sync_tree() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into team_relationships (ancestor_id, descendant_id, depth) values (new.id, new.id, 0);
    if new.sponsor_id is not null then
      insert into team_relationships (ancestor_id, descendant_id, depth)
      select tr.ancestor_id, new.id, tr.depth + 1
      from team_relationships tr where tr.descendant_id = new.sponsor_id;
    end if;
    return new;
  end if;

  -- UPDATE of sponsor_id: detach the whole subtree from its old ancestors,
  -- then attach it under the new sponsor's ancestors.
  delete from team_relationships t
  using team_relationships sub, team_relationships sup
  where sub.ancestor_id = new.id
    and sup.descendant_id = new.id and sup.ancestor_id <> new.id
    and t.ancestor_id = sup.ancestor_id
    and t.descendant_id = sub.descendant_id;

  if new.sponsor_id is not null then
    insert into team_relationships (ancestor_id, descendant_id, depth)
    select sup.ancestor_id, sub.descendant_id, sup.depth + sub.depth + 1
    from team_relationships sup
    cross join team_relationships sub
    where sup.descendant_id = new.sponsor_id
      and sub.ancestor_id = new.id;
  end if;
  return new;
end $$;

-- Named with a 00 prefix: PostgreSQL fires same-event triggers alphabetically,
-- and every other profile trigger relies on the closure rows existing.
create trigger profiles_00_tree_insert after insert on public.profiles
  for each row execute function public.profiles_sync_tree();
create trigger profiles_00_tree_update after update of sponsor_id on public.profiles
  for each row when (new.sponsor_id is distinct from old.sponsor_id)
  execute function public.profiles_sync_tree();

-- Keep the derived "sponsor" and "downline" roles in step with the tree.
create or replace function public.profiles_sync_derived_roles() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_sponsor_role smallint := (select id from roles where key = 'sponsor');
  v_upline_role  smallint := (select id from roles where key = 'upline');
  v_down_role    smallint := (select id from roles where key = 'downline');
begin
  if new.sponsor_id is not null then
    insert into user_roles (user_id, role_id) values (new.sponsor_id, v_sponsor_role) on conflict do nothing;
    insert into user_roles (user_id, role_id) values (new.id, v_down_role) on conflict do nothing;
    -- Anyone two or more levels above this member is now an upline.
    insert into user_roles (user_id, role_id)
    select tr.ancestor_id, v_upline_role from team_relationships tr
    where tr.descendant_id = new.id and tr.depth >= 2
    on conflict do nothing;
  end if;
  return new;
end $$;

create trigger profiles_derived_roles after insert or update of sponsor_id on public.profiles
  for each row execute function public.profiles_sync_derived_roles();

-- Is target the current user, or inside their downline within max_depth?
create or replace function public.is_in_my_downline(target uuid, max_depth integer default null)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_relationships
    where ancestor_id = auth.uid() and descendant_id = target and depth >= 1
      and (max_depth is null or depth <= max_depth)
  )
$$;

-- Is target one of the current user's uplines (anywhere above them)?
create or replace function public.is_my_upline(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.team_relationships
    where ancestor_id = target and descendant_id = auth.uid() and depth >= 1
  )
$$;

-- Central "may the current user see this member's activity data?" check
-- (attendance, goals, evaluations, orders). Leaders see only their own branch.
create or replace function public.can_view_team_data(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    target = auth.uid()
    or public.has_permission('view_org_analytics')
    or (public.has_permission('view_extended_downline') and public.is_in_my_downline(target))
    or (public.has_permission('view_direct_downlines') and public.is_in_my_downline(target, 1))
$$;

-- Profile visibility: team-data viewers, plus a member may see their own
-- sponsor's and upline's basic profile (but not their activity data).
create or replace function public.can_view_member(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_view_team_data(target)
    or exists (select 1 from public.profiles
               where id = auth.uid() and (sponsor_id = target or upline_id = target))
$$;

-- -----------------------------------------------------------------------------
-- App settings (key/value, admin-managed)
-- -----------------------------------------------------------------------------
create table public.app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value) values
  ('active_member_definition', jsonb_build_object(
      'window_days', 30,
      'min_attendance_days', 4,
      'min_prospects', 10,
      'min_orders', 1,
      'min_evaluations', 3,
      'require_all', false)),
  ('organisation', jsonb_build_object('name', 'Maximus', 'currency', 'NGN', 'timezone', 'Africa/Lagos')),
  ('features', jsonb_build_object('nin_verification', false, 'ai_assistant', true, 'email_notifications', false));

-- -----------------------------------------------------------------------------
-- Audit log (append-only)
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id         bigint generated always as identity primary key,
  actor_id   uuid references public.profiles (id) on delete set null,
  action     text not null,
  entity     text not null,
  entity_id  text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id);

create or replace function public.write_audit(p_action text, p_entity text, p_entity_id text, p_data jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  insert into public.audit_logs (actor_id, action, entity, entity_id, data)
  values (auth.uid(), p_action, p_entity, p_entity_id, coalesce(p_data, '{}'::jsonb));
$$;
revoke execute on function public.write_audit(text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.audit_logs_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'Audit logs are append-only';
end $$;
create trigger audit_logs_no_update before update or delete on public.audit_logs
  for each row execute function public.audit_logs_immutable();

-- -----------------------------------------------------------------------------
-- New user bootstrap: create profile from sign-up metadata.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  meta        jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_ref       text := nullif(upper(trim(meta ->> 'referral_code')), '');
  v_sponsor   uuid;
  v_upline    uuid;
  v_office    uuid;
begin
  if v_ref is not null then
    select id into v_sponsor from profiles
    where upper(referral_code) = v_ref or upper(member_id) = v_ref
    limit 1;
    if v_sponsor is null then
      raise exception 'Unknown sponsor referral code or member ID: %', v_ref using errcode = 'P0001';
    end if;
  end if;

  if nullif(meta ->> 'upline_member_id', '') is not null then
    select id into v_upline from profiles where upper(member_id) = upper(trim(meta ->> 'upline_member_id'));
  end if;

  if nullif(meta ->> 'office_id', '') is not null then
    select id into v_office from offices where id = (meta ->> 'office_id')::uuid and is_active;
  end if;

  insert into profiles (
    id, full_name, email, phone, whatsapp, date_of_birth, gender,
    office_id, sponsor_id, upline_id, privacy_accepted_at, timezone, birthday_visibility
  ) values (
    new.id,
    coalesce(nullif(trim(meta ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email,
    nullif(meta ->> 'phone', ''),
    nullif(meta ->> 'whatsapp', ''),
    nullif(meta ->> 'date_of_birth', '')::date,
    nullif(meta ->> 'gender', ''),
    v_office,
    v_sponsor,
    coalesce(v_upline, v_sponsor),
    coalesce((meta ->> 'privacy_accepted_at')::timestamptz, now()),
    coalesce(nullif(meta ->> 'timezone', ''), 'Africa/Lagos'),
    case when meta ->> 'birthday_visibility' in ('private', 'day_month', 'full')
         then (meta ->> 'birthday_visibility')::birthday_visibility else 'private' end
  );

  insert into user_roles (user_id, role_id) select new.id, id from roles where key = 'member';
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lookup used by the registration form to show who the sponsor is.
-- Returns only a name for a valid code; never exposes other fields.
create or replace function public.lookup_sponsor(code text)
returns table (full_name text, member_id text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.member_id from public.profiles p
  where p.status = 'active'
    and (upper(p.referral_code) = upper(trim(code)) or upper(p.member_id) = upper(trim(code)))
  limit 1
$$;
grant execute on function public.lookup_sponsor(text) to anon, authenticated;

-- One-time bootstrap: promote the first administrator by email.
-- Run from the Supabase SQL editor (service role). Not callable by app users.
create or replace function public.bootstrap_super_admin(admin_email text)
returns text language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from profiles where lower(email) = lower(admin_email);
  if v_id is null then
    raise exception 'No member registered with email %', admin_email;
  end if;
  insert into user_roles (user_id, role_id)
  select v_id, id from roles where key = 'super_admin' on conflict do nothing;
  insert into audit_logs (actor_id, action, entity, entity_id) values (v_id, 'bootstrap_super_admin', 'profile', v_id::text);
  return 'Super Admin granted to ' || admin_email;
end $$;
revoke execute on function public.bootstrap_super_admin(text) from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- Role management (server-enforced)
-- -----------------------------------------------------------------------------
create or replace function public.assign_role(target uuid, role_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_role roles%rowtype;
begin
  if not has_permission('manage_roles') then
    raise exception 'You do not have permission to manage roles' using errcode = '42501';
  end if;
  select * into v_role from roles where key = role_key;
  if not found then raise exception 'Unknown role %', role_key; end if;
  -- Only someone of strictly higher rank may grant a role (super admins may grant any).
  if v_role.rank >= my_max_rank() and not has_role('super_admin') then
    raise exception 'You cannot grant a role at or above your own level' using errcode = '42501';
  end if;
  insert into user_roles (user_id, role_id, granted_by) values (target, v_role.id, auth.uid())
  on conflict do nothing;
  perform write_audit('role_granted', 'profile', target::text, jsonb_build_object('role', role_key));
end $$;

create or replace function public.revoke_role(target uuid, role_key text)
returns void language plpgsql security definer set search_path = public as $$
declare v_role roles%rowtype;
begin
  if not has_permission('manage_roles') then
    raise exception 'You do not have permission to manage roles' using errcode = '42501';
  end if;
  select * into v_role from roles where key = role_key;
  if not found then raise exception 'Unknown role %', role_key; end if;
  if role_key = 'member' then raise exception 'The member role cannot be removed'; end if;
  if v_role.rank >= my_max_rank() and not has_role('super_admin') then
    raise exception 'You cannot remove a role at or above your own level' using errcode = '42501';
  end if;
  if role_key = 'super_admin' and target = auth.uid() then
    raise exception 'You cannot remove your own Super Admin role';
  end if;
  delete from user_roles where user_id = target and role_id = v_role.id;
  perform write_audit('role_revoked', 'profile', target::text, jsonb_build_object('role', role_key));
end $$;

-- Admin-only: move a member under a different sponsor (cycle-checked by trigger).
create or replace function public.change_sponsor(target uuid, new_sponsor uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_permission('manage_roles') then
    raise exception 'Only administrators can change sponsors' using errcode = '42501';
  end if;
  update profiles set sponsor_id = new_sponsor where id = target;
  perform write_audit('sponsor_changed', 'profile', target::text, jsonb_build_object('new_sponsor', new_sponsor));
end $$;

-- Admin-only: activate / suspend a member.
create or replace function public.set_member_status(target uuid, new_status public.member_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_permission('manage_roles') then
    raise exception 'Only administrators can change member status' using errcode = '42501';
  end if;
  if target = auth.uid() then raise exception 'You cannot change your own status'; end if;
  update profiles set status = new_status where id = target;
  perform write_audit('status_changed', 'profile', target::text, jsonb_build_object('status', new_status));
end $$;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.roles              enable row level security;
alter table public.permissions        enable row level security;
alter table public.role_permissions   enable row level security;
alter table public.user_roles         enable row level security;
alter table public.team_relationships enable row level security;
alter table public.app_settings       enable row level security;
alter table public.audit_logs         enable row level security;
alter table public.offices            enable row level security;

-- Profiles: visible to self, sponsor chain and authorised leaders.
create policy profiles_select on public.profiles for select to authenticated
  using (public.can_view_member(id));

-- Members may update only their own personal fields (column grants below).
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone, whatsapp, date_of_birth, gender, avatar_url, bio, timezone,
              birthday_visibility, ai_memory_enabled, onboarding_completed)
  on public.profiles to authenticated;
revoke insert, delete on public.profiles from authenticated, anon;

-- RBAC catalogue is readable by any signed-in user (it is not sensitive).
create policy roles_read on public.roles for select to authenticated using (true);
create policy permissions_read on public.permissions for select to authenticated using (true);
create policy role_permissions_read on public.role_permissions for select to authenticated using (true);
revoke insert, update, delete on public.roles, public.permissions, public.role_permissions from authenticated, anon;

-- Role assignments: own roles, plus anyone you are allowed to view.
create policy user_roles_read on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.can_view_member(user_id));
revoke insert, update, delete on public.user_roles from authenticated, anon;

create policy team_rel_read on public.team_relationships for select to authenticated
  using (public.can_view_member(descendant_id) and public.can_view_member(ancestor_id));
revoke insert, update, delete on public.team_relationships from authenticated, anon;

create policy app_settings_read on public.app_settings for select to authenticated using (true);
create policy app_settings_write on public.app_settings for all to authenticated
  using (public.has_permission('manage_roles')) with check (public.has_permission('manage_roles'));

create policy audit_logs_read on public.audit_logs for select to authenticated
  using (public.has_permission('view_org_analytics'));
revoke insert, update, delete on public.audit_logs from authenticated, anon;

-- Offices: signed-in members see active offices. The public registration form
-- uses list_public_offices(), which exposes names only (no GPS coordinates).
create policy offices_read on public.offices for select to authenticated
  using (is_active or public.has_permission('manage_office'));

create or replace function public.list_public_offices()
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select id, name from public.offices where is_active order by name
$$;
grant execute on function public.list_public_offices() to anon, authenticated;
create policy offices_write on public.offices for all to authenticated
  using (public.has_permission('manage_office')) with check (public.has_permission('manage_office'));

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

-- =============================================================================
-- MAXIMUS — 0003 Notifications
-- In-app notifications are rows in `notifications`. Web push delivery is done by
-- the Next.js server (/api/push/dispatch), which reads rows whose push_status is
-- 'pending', applies preferences and quiet hours, and records the outcome.
-- =============================================================================

create table public.notification_preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  push_enabled   boolean not null default true,
  email_enabled  boolean not null default false,
  -- Notification types the member has switched off (see lib/notifications/types.ts).
  muted_types    text[] not null default '{}',
  quiet_start    time default '22:00',
  quiet_end      time default '07:00',
  updated_at     timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function public.set_updated_at();

create type public.push_status as enum ('pending', 'sent', 'skipped', 'deferred', 'failed');

create table public.notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  type          text not null,
  title         text not null,
  body          text,
  link          text,
  data          jsonb not null default '{}'::jsonb,
  read_at       timestamptz,
  push_status   public.push_status not null default 'pending',
  push_after    timestamptz,
  push_attempts smallint not null default 0,
  created_at    timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;
create index notifications_push_queue_idx on public.notifications (created_at) where push_status in ('pending', 'deferred');

create table public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  endpoint     text not null unique,
  p256dh       text not null,
  auth         text not null,
  user_agent   text,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

-- Internal helper used by triggers and server functions to create a notification.
-- Respects muted types. Not callable directly by app users.
create or replace function public.notify(
  p_user uuid, p_type text, p_title text, p_body text default null,
  p_link text default null, p_data jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if p_user is null then return null; end if;
  if exists (select 1 from notification_preferences where user_id = p_user and p_type = any (muted_types)) then
    return null;
  end if;
  insert into notifications (user_id, type, title, body, link, data)
  values (p_user, p_type, p_title, p_body, p_link, coalesce(p_data, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.notify(uuid, text, text, text, text, jsonb) from public, anon, authenticated;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns integer language sql security definer set search_path = public as $$
  with u as (
    update public.notifications set read_at = now()
    where user_id = auth.uid() and read_at is null and (p_ids is null or id = any (p_ids))
    returning 1
  ) select count(*)::int from u
$$;

-- Every new profile gets default preferences.
create or replace function public.profiles_default_preferences() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger profiles_default_preferences after insert on public.profiles
  for each row execute function public.profiles_default_preferences();

-- Tell the sponsor when someone joins their team.
create or replace function public.profiles_notify_sponsor() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.sponsor_id is not null then
    perform notify(new.sponsor_id, 'team_registration', 'New team member',
                   new.full_name || ' just joined your team.', '/team',
                   jsonb_build_object('member_id', new.id));
  end if;
  return new;
end $$;
create trigger profiles_notify_sponsor after insert on public.profiles
  for each row execute function public.profiles_notify_sponsor();

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.push_subscriptions enable row level security;

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy notifications_own_read on public.notifications for select to authenticated
  using (user_id = auth.uid());
-- Members mark items read via mark_notifications_read(); no direct writes.
revoke insert, update, delete on public.notifications from authenticated, anon;

create policy push_subscriptions_own on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =============================================================================
-- MAXIMUS — 0004 Monthly Goals & Five-Day Evaluations
-- =============================================================================

create type public.goal_status as enum ('draft', 'submitted', 'approved', 'revision_requested');

create table public.monthly_goals (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references public.profiles (id) on delete cascade,
  month                       date not null check (extract(day from month) = 1),
  income_target               numeric(14, 2) check (income_target >= 0),
  sales_target                numeric(14, 2) check (sales_target >= 0),
  prospecting_target          integer check (prospecting_target >= 0),
  recruitment_target          integer check (recruitment_target >= 0),
  order_target                integer check (order_target >= 0),
  savings_target              numeric(14, 2) check (savings_target >= 0),
  personal_development_target text check (length(personal_development_target) <= 1000),
  -- [{ "title": "Read 2 books", "target": 2, "unit": "books", "progress": 0 }]
  custom_goals                jsonb not null default '[]'::jsonb check (jsonb_typeof(custom_goals) = 'array'),
  status                      public.goal_status not null default 'draft',
  reviewer_id                 uuid references public.profiles (id) on delete set null,
  submitted_at                timestamptz,
  reviewed_at                 timestamptz,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (user_id, month)
);
create index monthly_goals_month_idx on public.monthly_goals (month, status);
create trigger monthly_goals_updated_at before update on public.monthly_goals
  for each row execute function public.set_updated_at();

create type public.goal_feedback_action as enum ('comment', 'approve', 'request_revision');

create table public.goal_feedback (
  id           uuid primary key default gen_random_uuid(),
  goal_id      uuid not null references public.monthly_goals (id) on delete cascade,
  author_id    uuid not null references public.profiles (id) on delete cascade,
  action       public.goal_feedback_action not null default 'comment',
  comment      text check (length(comment) <= 2000),
  action_steps text check (length(action_steps) <= 2000),
  created_at   timestamptz not null default now()
);
create index goal_feedback_goal_idx on public.goal_feedback (goal_id, created_at);

-- Owners may edit only drafts or goals sent back for revision, and may only
-- move them to 'draft' or 'submitted'. Approvals go through review_goal().
create or replace function public.monthly_goals_guard() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_reviewer uuid;
begin
  if current_setting('maximus.goal_review', true) = 'on' then
    return new;  -- change made by review_goal()
  end if;
  if tg_op = 'UPDATE' and old.status not in ('draft', 'revision_requested') then
    raise exception 'This goal has been % and can no longer be edited', old.status;
  end if;
  if new.status not in ('draft', 'submitted') then
    raise exception 'Invalid status change';
  end if;
  new.reviewer_id := null;
  new.reviewed_at := null;
  if new.status = 'submitted' then
    new.submitted_at := now();
    select sponsor_id into v_reviewer from profiles where id = new.user_id;
    new.reviewer_id := v_reviewer;
  end if;
  return new;
end $$;
create trigger monthly_goals_guard before insert or update on public.monthly_goals
  for each row execute function public.monthly_goals_guard();

create or replace function public.monthly_goals_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_name text;
begin
  if new.status = 'submitted' and (tg_op = 'INSERT' or old.status <> 'submitted') and new.reviewer_id is not null then
    select full_name into v_name from profiles where id = new.user_id;
    perform notify(new.reviewer_id, 'goal_submitted', 'New monthly goals to review',
                   v_name || ' submitted goals for ' || to_char(new.month, 'FMMonth YYYY') || '.',
                   '/goals/' || new.id, jsonb_build_object('goal_id', new.id));
  end if;
  return new;
end $$;
create trigger monthly_goals_notify after insert or update of status on public.monthly_goals
  for each row execute function public.monthly_goals_notify();

create or replace function public.review_goal(
  p_goal uuid, p_action public.goal_feedback_action, p_comment text default null, p_steps text default null
) returns public.goal_feedback
language plpgsql security definer set search_path = public as $$
declare v_goal monthly_goals; v_fb goal_feedback;
begin
  select * into v_goal from monthly_goals where id = p_goal for update;
  if not found then raise exception 'Goal not found'; end if;
  if v_goal.user_id = auth.uid() then raise exception 'You cannot review your own goals'; end if;
  if not (has_permission('review_member_goals') and can_view_team_data(v_goal.user_id)) then
    raise exception 'You are not authorised to review this member''s goals' using errcode = '42501';
  end if;
  if p_action <> 'comment' and v_goal.status <> 'submitted' then
    raise exception 'Only submitted goals can be approved or sent back';
  end if;
  if p_action = 'comment' and nullif(trim(coalesce(p_comment, '') || coalesce(p_steps, '')), '') is null then
    raise exception 'Please write a comment or action steps';
  end if;

  insert into goal_feedback (goal_id, author_id, action, comment, action_steps)
  values (p_goal, auth.uid(), p_action, nullif(trim(p_comment), ''), nullif(trim(p_steps), ''))
  returning * into v_fb;

  if p_action <> 'comment' then
    perform set_config('maximus.goal_review', 'on', true);
    update monthly_goals set
      status = case p_action when 'approve' then 'approved'::goal_status else 'revision_requested'::goal_status end,
      reviewer_id = auth.uid(), reviewed_at = now()
    where id = p_goal;
    perform set_config('maximus.goal_review', 'off', true);
  end if;

  perform notify(v_goal.user_id, 'sponsor_feedback',
    case p_action when 'approve' then 'Your goals were approved 🎉'
                  when 'request_revision' then 'Your sponsor requested goal revisions'
                  else 'New feedback on your goals' end,
    coalesce(left(p_comment, 140), left(p_steps, 140)),
    '/goals/' || p_goal, jsonb_build_object('goal_id', p_goal));
  return v_fb;
end $$;

-- -----------------------------------------------------------------------------
-- Five-day evaluations: 1st, 5th, 10th, 15th, 20th, 25th, 30th.
-- In shorter months the 30th becomes the last day of the month.
-- -----------------------------------------------------------------------------
create or replace function public.evaluation_dates(p_month date)
returns setof date language sql immutable as $$
  select distinct least(date_trunc('month', p_month)::date + (d - 1),
                        (date_trunc('month', p_month) + interval '1 month - 1 day')::date)
  from unnest(array[1, 5, 10, 15, 20, 25, 30]) as d
  order by 1
$$;

create or replace function public.current_evaluation_period(p_day date default current_date)
returns date language sql immutable as $$
  select max(d) from public.evaluation_dates(p_day) d where d <= p_day
$$;

create or replace function public.next_evaluation_date(p_day date default current_date)
returns date language sql immutable as $$
  select coalesce(
    (select min(d) from public.evaluation_dates(p_day) d where d > p_day),
    (date_trunc('month', p_day) + interval '1 month')::date)
$$;

create table public.evaluations (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  period_date       date not null,
  earnings          numeric(14, 2) not null default 0 check (earnings >= 0),
  prospects         integer not null default 0 check (prospects >= 0),
  presentations     integer not null default 0 check (presentations >= 0),
  follow_ups        integer not null default 0 check (follow_ups >= 0),
  orders_generated  integer not null default 0 check (orders_generated >= 0),
  new_joins         integer not null default 0 check (new_joins >= 0),
  members_supported integer not null default 0 check (members_supported >= 0),
  challenges        text check (length(challenges) <= 2000),
  priorities        text check (length(priorities) <= 2000),
  support_needed    text check (length(support_needed) <= 2000),
  submitted_at      timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (user_id, period_date)
);
create index evaluations_period_idx on public.evaluations (period_date);
create trigger evaluations_updated_at before update on public.evaluations
  for each row execute function public.set_updated_at();

create or replace function public.evaluations_guard() returns trigger
language plpgsql as $$
begin
  if new.period_date not in (select public.evaluation_dates(new.period_date)) then
    raise exception 'Evaluations are due on the 1st, 5th, 10th, 15th, 20th, 25th and 30th (or month end)';
  end if;
  if new.period_date > current_date then
    raise exception 'You cannot submit an evaluation for a future date';
  end if;
  if tg_op = 'UPDATE' then
    if new.user_id <> old.user_id or new.period_date <> old.period_date then
      raise exception 'Evaluation owner and period cannot be changed';
    end if;
    -- Editable only until the next evaluation date.
    if current_date >= public.next_evaluation_date(old.period_date) then
      raise exception 'This evaluation period has closed';
    end if;
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;
create trigger evaluations_guard before insert or update on public.evaluations
  for each row execute function public.evaluations_guard();

create or replace function public.evaluations_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_sponsor uuid; v_name text;
begin
  select sponsor_id, full_name into v_sponsor, v_name from profiles where id = new.user_id;
  perform notify(v_sponsor, 'evaluation_completed', 'Evaluation completed',
                 v_name || ' completed the ' || to_char(new.period_date, 'FMDDth Mon') || ' evaluation.',
                 '/evaluations/' || new.id, jsonb_build_object('evaluation_id', new.id));
  return new;
end $$;
create trigger evaluations_notify after insert on public.evaluations
  for each row execute function public.evaluations_notify();

create table public.evaluation_feedback (
  id            uuid primary key default gen_random_uuid(),
  evaluation_id uuid not null references public.evaluations (id) on delete cascade,
  author_id     uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  comment       text not null check (length(trim(comment)) between 1 and 2000),
  created_at    timestamptz not null default now()
);
create index evaluation_feedback_eval_idx on public.evaluation_feedback (evaluation_id, created_at);

create or replace function public.evaluation_feedback_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_owner uuid;
begin
  select user_id into v_owner from evaluations where id = new.evaluation_id;
  perform notify(v_owner, 'sponsor_feedback', 'New feedback on your evaluation',
                 left(new.comment, 140), '/evaluations/' || new.evaluation_id,
                 jsonb_build_object('evaluation_id', new.evaluation_id));
  return new;
end $$;
create trigger evaluation_feedback_notify after insert on public.evaluation_feedback
  for each row execute function public.evaluation_feedback_notify();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
alter table public.monthly_goals enable row level security;
alter table public.goal_feedback enable row level security;
alter table public.evaluations enable row level security;
alter table public.evaluation_feedback enable row level security;

create policy monthly_goals_read on public.monthly_goals for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy monthly_goals_insert on public.monthly_goals for insert to authenticated
  with check (user_id = auth.uid());
create policy monthly_goals_update on public.monthly_goals for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy monthly_goals_delete on public.monthly_goals for delete to authenticated
  using (user_id = auth.uid() and status = 'draft');

create policy goal_feedback_read on public.goal_feedback for select to authenticated
  using (exists (select 1 from public.monthly_goals g where g.id = goal_id
                 and (g.user_id = auth.uid() or public.can_view_team_data(g.user_id))));
revoke insert, update, delete on public.goal_feedback from authenticated, anon;

create policy evaluations_read on public.evaluations for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy evaluations_insert on public.evaluations for insert to authenticated
  with check (user_id = auth.uid());
create policy evaluations_update on public.evaluations for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy evaluation_feedback_read on public.evaluation_feedback for select to authenticated
  using (exists (select 1 from public.evaluations e where e.id = evaluation_id
                 and (e.user_id = auth.uid() or public.can_view_team_data(e.user_id))));
create policy evaluation_feedback_insert on public.evaluation_feedback for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.has_permission('review_member_goals')
    and exists (select 1 from public.evaluations e where e.id = evaluation_id
                and e.user_id <> auth.uid() and public.can_view_team_data(e.user_id)));

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

-- =============================================================================
-- MAXIMUS — 0006 Announcements, Recognition & Birthdays
-- =============================================================================

create type public.announcement_kind as enum ('announcement', 'training', 'recognition');
create type public.announcement_audience as enum ('all', 'office', 'team');

create table public.announcements (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid references public.profiles (id) on delete set null default auth.uid(),
  kind         public.announcement_kind not null default 'announcement',
  audience     public.announcement_audience not null default 'all',
  office_id    uuid references public.offices (id) on delete cascade,
  -- For recognition posts: the member being celebrated.
  recipient_id uuid references public.profiles (id) on delete cascade,
  title        text not null check (length(trim(title)) between 3 and 160),
  body         text not null check (length(trim(body)) between 1 and 5000),
  pinned       boolean not null default false,
  published_at timestamptz not null default now(),
  expires_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint announcements_office_audience check (audience <> 'office' or office_id is not null),
  constraint announcements_recognition_recipient check (kind <> 'recognition' or recipient_id is not null)
);
create index announcements_published_idx on public.announcements (published_at desc);

create or replace function public.can_see_announcement(a public.announcements)
returns boolean language sql stable security definer set search_path = public as $$
  select a.author_id = auth.uid()
      or public.has_permission('view_org_analytics')
      or (a.published_at <= now() and (a.expires_at is null or a.expires_at > now()) and (
            a.audience = 'all'
         or (a.audience = 'office' and exists (select 1 from office_memberships
                                               where office_id = a.office_id and user_id = auth.uid()))
         or (a.audience = 'team' and exists (select 1 from team_relationships
                                             where ancestor_id = a.author_id and descendant_id = auth.uid()))))
$$;

create or replace function public.can_publish(p_kind public.announcement_kind, p_audience public.announcement_audience,
                                              p_office uuid, p_recipient uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    -- Leaders may recognise members of their own team, to their own team.
    when p_kind = 'recognition' and p_audience = 'team' then
      public.has_permission('view_team_dashboard') and public.can_view_team_data(p_recipient)
    when p_audience = 'office' then
      public.has_permission('publish_announcements') and public.can_manage_office(p_office)
    when p_audience = 'team' then
      public.has_permission('publish_announcements')
    else
      public.has_permission('publish_announcements') and public.has_permission('view_org_analytics')
  end
$$;

-- Fan the announcement out to its audience as notifications.
create or replace function public.announcements_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_type text := case new.kind when 'training' then 'training_announcement'
                                     when 'recognition' then 'recognition'
                                     else 'admin_announcement' end;
begin
  insert into notifications (user_id, type, title, body, link, data)
  select p.id, v_type, new.title, left(new.body, 160), '/announcements/' || new.id,
         jsonb_build_object('announcement_id', new.id)
  from profiles p
  where p.status = 'active'
    and p.id is distinct from new.author_id
    and (new.audience = 'all'
      or (new.audience = 'office' and exists (select 1 from office_memberships m where m.office_id = new.office_id and m.user_id = p.id))
      or (new.audience = 'team' and exists (select 1 from team_relationships t where t.ancestor_id = new.author_id and t.descendant_id = p.id)))
    and not exists (select 1 from notification_preferences np where np.user_id = p.id and v_type = any (np.muted_types));
  return new;
end $$;
create trigger announcements_notify after insert on public.announcements
  for each row execute function public.announcements_notify();

alter table public.announcements enable row level security;
create policy announcements_read on public.announcements for select to authenticated
  using (public.can_see_announcement(announcements));
create policy announcements_insert on public.announcements for insert to authenticated
  with check (author_id = auth.uid() and public.can_publish(kind, audience, office_id, recipient_id));
create policy announcements_update on public.announcements for update to authenticated
  using (author_id = auth.uid() or public.has_permission('view_org_analytics'))
  with check (public.can_publish(kind, audience, office_id, recipient_id));
create policy announcements_delete on public.announcements for delete to authenticated
  using (author_id = auth.uid() or public.has_permission('view_org_analytics'));

-- -----------------------------------------------------------------------------
-- Birthdays & anniversaries. Only members who opted in are listed, and the
-- birth year is shown only when the member chose 'full'.
-- -----------------------------------------------------------------------------
create or replace function public.upcoming_birthdays(p_days integer default 30)
returns table (member uuid, full_name text, avatar_url text, office_name text,
               birthday_month integer, birthday_day integer, birth_year integer, days_until integer)
language sql stable security definer set search_path = public as $$
  with b as (
    select p.id, p.full_name, p.avatar_url, o.name as office_name, p.date_of_birth, p.birthday_visibility,
           make_date(extract(year from current_date)::int, extract(month from p.date_of_birth)::int,
                     -- 29 Feb birthdays are celebrated on 28 Feb in non-leap years.
                     least(extract(day from p.date_of_birth)::int,
                           extract(day from (make_date(extract(year from current_date)::int, extract(month from p.date_of_birth)::int, 1)
                                             + interval '1 month - 1 day'))::int)) as this_year
    from profiles p left join offices o on o.id = p.office_id
    where p.status = 'active' and p.date_of_birth is not null and p.birthday_visibility <> 'private'
      and auth.uid() is not null
  )
  select id, full_name, avatar_url, office_name,
         extract(month from date_of_birth)::int, extract(day from date_of_birth)::int,
         case when birthday_visibility = 'full' then extract(year from date_of_birth)::int end,
         (case when this_year >= current_date then this_year else (this_year + interval '1 year')::date end - current_date)::int
  from b
  where (case when this_year >= current_date then this_year else (this_year + interval '1 year')::date end - current_date) <= p_days
  order by 8, 2
$$;

create or replace function public.upcoming_anniversaries(p_days integer default 30)
returns table (member uuid, full_name text, avatar_url text, years integer, days_until integer)
language sql stable security definer set search_path = public as $$
  with a as (
    select p.id, p.full_name, p.avatar_url, p.joined_at::date as joined,
           (p.joined_at::date + make_interval(years => (extract(year from age(current_date, p.joined_at::date))::int + 1))) as next_date,
           (p.joined_at::date + make_interval(years => extract(year from age(current_date, p.joined_at::date))::int)) as this_date
    from profiles p
    where p.status = 'active' and auth.uid() is not null
  )
  select id, full_name, avatar_url,
         extract(year from age(case when this_date::date = current_date then this_date else next_date end, joined))::int,
         ((case when this_date::date = current_date then this_date else next_date end)::date - current_date)::int
  from a
  where ((case when this_date::date = current_date then this_date else next_date end)::date - current_date) <= p_days
    and extract(year from age(case when this_date::date = current_date then this_date else next_date end, joined)) >= 1
  order by 5, 2
$$;

-- =============================================================================
-- MAXIMUS — 0007 Academy & Maximus AI
-- =============================================================================

create type public.course_category as enum (
  'getting_started', 'onboarding_academy', 'prospecting_masterclass', 'sales_follow_up',
  'leadership_development', 'team_building', 'financial_discipline', 'product_knowledge',
  'personal_development', 'recognition_success_stories'
);
create type public.course_status as enum ('draft', 'coming_soon', 'published');

create table public.courses (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9-]+$'),
  category      public.course_category not null,
  title         text not null check (length(trim(title)) between 3 and 160),
  description   text check (length(description) <= 2000),
  thumbnail_url text,
  level         text check (level in ('beginner', 'intermediate', 'advanced')),
  status        public.course_status not null default 'draft',
  sort_order    integer not null default 0,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index courses_category_idx on public.courses (category, sort_order);
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null references public.courses (id) on delete cascade,
  title            text not null check (length(trim(title)) between 2 and 160),
  content          text,                 -- Markdown
  video_url        text,
  resource_url     text,
  duration_minutes integer check (duration_minutes > 0),
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index lessons_course_idx on public.lessons (course_id, sort_order);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.course_progress (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.course_progress enable row level security;

create policy courses_read on public.courses for select to authenticated
  using (status <> 'draft' or public.has_permission('manage_content'));
create policy courses_write on public.courses for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));
create policy lessons_read on public.lessons for select to authenticated
  using (exists (select 1 from public.courses c where c.id = course_id
                 and (c.status = 'published' or public.has_permission('manage_content'))));
create policy lessons_write on public.lessons for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));
create policy course_progress_read on public.course_progress for select to authenticated
  using (user_id = auth.uid() or public.can_view_team_data(user_id));
create policy course_progress_write on public.course_progress for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.lessons l join public.courses c on c.id = l.course_id
    where l.id = lesson_id and c.status = 'published'));
create policy course_progress_delete on public.course_progress for delete to authenticated
  using (user_id = auth.uid());

-- Starter catalogue. "Getting Started" teaches the platform itself; everything
-- else is Coming Soon until administrators upload real lessons.
insert into public.courses (slug, category, title, description, level, status, sort_order) values
  ('welcome-to-maximus', 'getting_started', 'Welcome to Maximus',
   'Learn how to use Maximus: your dashboard, attendance, goals, evaluations and team tools.', 'beginner', 'published', 1),
  ('onboarding-first-30-days', 'onboarding_academy', 'Your First 30 Days',
   'A guided path for new members: habits, expectations and quick wins.', 'beginner', 'coming_soon', 1),
  ('prospecting-masterclass', 'prospecting_masterclass', 'Prospecting Masterclass',
   'Find, approach and invite the right people with confidence.', 'intermediate', 'coming_soon', 1),
  ('sales-and-follow-up', 'sales_follow_up', 'Sales and Follow-Up Systems',
   'Turn conversations into orders with a simple, repeatable follow-up rhythm.', 'intermediate', 'coming_soon', 1),
  ('leading-from-the-front', 'leadership_development', 'Leading from the Front',
   'The habits of leaders who build accountable, motivated teams.', 'advanced', 'coming_soon', 1),
  ('team-building-blueprint', 'team_building', 'Team Building Blueprint',
   'Duplicate success: onboarding, support and recognition for your downlines.', 'intermediate', 'coming_soon', 1),
  ('financial-discipline', 'financial_discipline', 'Financial Discipline',
   'Budgeting, saving and reinvesting your earnings wisely.', 'beginner', 'coming_soon', 1),
  ('product-knowledge-essentials', 'product_knowledge', 'Product Knowledge Essentials',
   'Know what you offer, who it helps and how to explain it simply.', 'beginner', 'coming_soon', 1),
  ('personal-development', 'personal_development', 'Personal Development Foundations',
   'Mindset, time management and consistency for long-term growth.', 'beginner', 'coming_soon', 1),
  ('success-stories', 'recognition_success_stories', 'Success Stories',
   'Real journeys from Maximus members who maximised their potential.', 'beginner', 'coming_soon', 1);

insert into public.lessons (course_id, title, content, duration_minutes, sort_order)
select c.id, l.title, l.content, l.minutes, l.ord
from public.courses c
join (values
  (1, 'Your dashboard', E'Your dashboard shows the numbers that matter this month: attendance streak, goal progress, evaluation status, savings and notifications.\n\nCheck it every morning and pick one action that moves your goals forward.', 4),
  (2, 'Checking in at the office', E'Open **Attendance** and tap **Check in** when you arrive. Your browser will ask for permission to share your location — this is only used to compare your position with your office''s registered location.\n\nIf your location is unavailable or you forgot to check in, submit a **correction request** and your office manager will review it.', 5),
  (3, 'Setting monthly goals', E'Between the 10th and 15th of every month you will be reminded to set or review your goals. Fill in your targets, submit, and your sponsor will review them.\n\nProgress is calculated automatically from your evaluations, orders and confirmed savings.', 5),
  (4, 'Five-day evaluations', E'On the 1st, 5th, 10th, 15th, 20th, 25th and 30th (or the last day of shorter months) you complete a short evaluation: earnings, prospects, presentations, follow-ups, orders and the support you need.\n\nHonest evaluations help your sponsor support you better.', 5),
  (5, 'Getting help from Maximus AI', E'Maximus AI can help you plan your week, practise a prospecting conversation or prepare for a presentation. It only answers from approved Maximus materials and never sees other members'' private data.', 3)
) as l(ord, title, content, minutes) on c.slug = 'welcome-to-maximus';

-- -----------------------------------------------------------------------------
-- Maximus AI
-- -----------------------------------------------------------------------------
create table public.ai_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  title      text not null default 'New conversation' check (length(title) <= 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

create table public.ai_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  user_id         uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  role            text not null check (role in ('user', 'assistant')),
  content         text not null check (length(content) <= 20000),
  created_at      timestamptz not null default now()
);
create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

-- Opt-in personal memory (profiles.ai_memory_enabled). Members can view and delete it.
create table public.ai_memories (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade default auth.uid(),
  content    text not null check (length(content) between 3 and 500),
  created_at timestamptz not null default now()
);
create index ai_memories_user_idx on public.ai_memories (user_id, created_at desc);

create table public.approved_knowledge (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (length(trim(title)) between 3 and 200),
  category     text not null default 'general',
  content      text not null check (length(content) between 10 and 50000),
  source       text,
  is_published boolean not null default true,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  search       tsvector generated always as (
                 setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                 setweight(to_tsvector('english', coalesce(category, '')), 'B') ||
                 setweight(to_tsvector('english', coalesce(content, '')), 'C')) stored,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index approved_knowledge_search_idx on public.approved_knowledge using gin (search);
create trigger approved_knowledge_updated_at before update on public.approved_knowledge
  for each row execute function public.set_updated_at();

-- Retrieval for the assistant: full-text search over approved knowledge.
create or replace function public.search_knowledge(p_query text, p_limit integer default 5)
returns table (id uuid, title text, category text, content text, rank real)
language sql stable security invoker set search_path = public as $$
  select k.id, k.title, k.category, k.content,
         ts_rank(k.search, websearch_to_tsquery('english', p_query)) as rank
  from approved_knowledge k
  where k.is_published and k.search @@ websearch_to_tsquery('english', p_query)
  order by rank desc
  limit least(greatest(p_limit, 1), 10)
$$;

-- Turning memory off deletes stored memories.
create or replace function public.profiles_clear_ai_memory() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.ai_memory_enabled and not new.ai_memory_enabled then
    delete from ai_memories where user_id = new.id;
  end if;
  return new;
end $$;
create trigger profiles_clear_ai_memory after update of ai_memory_enabled on public.profiles
  for each row execute function public.profiles_clear_ai_memory();

alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_memories enable row level security;
alter table public.approved_knowledge enable row level security;

-- Conversations and memories are strictly private to their owner — no leader or
-- admin policy exists for them.
create policy ai_conversations_own on public.ai_conversations for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy ai_messages_own on public.ai_messages for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.ai_conversations c where c.id = conversation_id and c.user_id = auth.uid()));
create policy ai_memories_own on public.ai_memories for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.ai_memory_enabled));

create policy approved_knowledge_read on public.approved_knowledge for select to authenticated
  using (is_published or public.has_permission('manage_content'));
create policy approved_knowledge_write on public.approved_knowledge for all to authenticated
  using (public.has_permission('manage_content')) with check (public.has_permission('manage_content'));

insert into public.approved_knowledge (title, category, content, source) values
  ('The five-day evaluation rhythm', 'platform',
   'Maximus members complete an evaluation on the 1st, 5th, 10th, 15th, 20th, 25th and 30th of every month (the last day in shorter months). Each evaluation records earnings, prospects contacted, presentations, follow-ups, orders, new team members, members supported, challenges, priorities for the next five days and support needed from the sponsor.',
   'Maximus platform guide'),
  ('Monthly goal setting', 'platform',
   'Between the 10th and the 15th of every month members set or review monthly goals: income, sales, prospecting, recruitment, product orders, personal development, savings and custom goals. Submitted goals go to the sponsor, who can comment, approve, request revisions and recommend action steps.',
   'Maximus platform guide'),
  ('Office attendance', 'platform',
   'Members check in and out using the Attendance page. With permission, the browser location is compared with the office''s registered coordinates and radius. A verified check-in means the reported location was inside the radius; it does not prove physical presence. Missed or incorrect check-ins can be corrected by submitting a correction request for manager review.',
   'Maximus platform guide'),
  ('Brand purpose', 'about',
   'Maximus exists to empower young, driven individuals committed to freelancing, self-growth and building meaningful careers on their own terms. The brand is rooted in ambition, discipline and progress. Tagline: Fulfilment in maximized potential.',
   'Maximus logo manual');

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

commit;
