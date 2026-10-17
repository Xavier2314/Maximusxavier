-- =============================================================================
-- MAXIMUS — 0001 Foundation
-- Profiles, role-based access control, team hierarchy (closure table),
-- app settings and audit logging.
-- =============================================================================

-- Supabase keeps extensions in the `extensions` schema.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- -----------------------------------------------------------------------------
-- Shared helpers
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- -----------------------------------------------------------------------------
-- Offices (declared early because profiles reference them; attendance logic
-- lives in migration 0002)
-- -----------------------------------------------------------------------------
create table public.offices (
  id               uuid primary key default gen_random_uuid(),
  name             text not null check (length(trim(name)) between 2 and 120),
  address          text,
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  radius_m         integer not null default 100 check (radius_m between 10 and 5000),
  timezone         text not null default 'Africa/Lagos',
  -- e.g. {"mon":{"open":"08:00","close":"17:00"}, ...}
  schedule         jsonb not null default '{}'::jsonb,
  manager_id       uuid,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (name)
);
create trigger offices_updated_at before update on public.offices
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Profiles
-- -----------------------------------------------------------------------------
create sequence public.member_number_seq start 1001;

create type public.member_status as enum ('active', 'suspended', 'deactivated');
create type public.birthday_visibility as enum ('private', 'day_month', 'full');

create table public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  member_id              text not null unique
                           default ('MX-' || lpad(nextval('public.member_number_seq')::text, 6, '0')),
  referral_code          text not null unique
                           default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  full_name              text not null check (length(trim(full_name)) between 2 and 120),
  email                  text not null,
  phone                  text,
  whatsapp               text,
  date_of_birth          date check (date_of_birth > '1900-01-01' and date_of_birth < current_date),
  gender                 text check (gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  office_id              uuid references public.offices (id) on delete set null,
  sponsor_id             uuid references public.profiles (id) on delete set null,
  upline_id              uuid references public.profiles (id) on delete set null,
  avatar_url             text,
  bio                    text check (length(bio) <= 500),
  timezone               text not null default 'Africa/Lagos',
  birthday_visibility    public.birthday_visibility not null default 'private',
  ai_memory_enabled      boolean not null default false,
  status                 public.member_status not null default 'active',
  privacy_accepted_at    timestamptz not null,
  onboarding_completed   boolean not null default false,
  joined_at              timestamptz not null default now(),
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint profiles_no_self_sponsor check (sponsor_id is null or sponsor_id <> id),
  constraint profiles_no_self_upline check (upline_id is null or upline_id <> id)
);

create index profiles_sponsor_idx on public.profiles (sponsor_id);
create index profiles_upline_idx on public.profiles (upline_id);
create index profiles_office_idx on public.profiles (office_id);
create index profiles_name_trgm_idx on public.profiles using gin (full_name extensions.gin_trgm_ops);
create index profiles_dob_md_idx on public.profiles ((extract(month from date_of_birth)), (extract(day from date_of_birth)));

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.offices
  add constraint offices_manager_fk foreign key (manager_id) references public.profiles (id) on delete set null;

-- -----------------------------------------------------------------------------
-- Role-based access control
-- A user can hold many roles; each role grants a set of permissions.
-- -----------------------------------------------------------------------------
create table public.roles (
  id          smallint generated always as identity primary key,
  key         text not null unique,
  name        text not null,
  description text,
  -- Higher rank = more authority. Used to stop people granting roles above their own.
  rank        smallint not null,
  is_elevated boolean not null default false
);

create table public.permissions (
  key         text primary key,
  description text not null
);

create table public.role_permissions (
  role_id        smallint not null references public.roles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role_id, permission_key)
);

create table public.user_roles (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  role_id    smallint not null references public.roles (id) on delete cascade,
  granted_by uuid references public.profiles (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);
create index user_roles_role_idx on public.user_roles (role_id);

insert into public.roles (key, name, description, rank, is_elevated) values
  ('member',          'Member',          'Every registered member',                          10, false),
  ('downline',        'Downline',        'Member registered under a sponsor',                10, false),
  ('upline',          'Upline',          'Member with an extended network below them',       20, false),
  ('sponsor',         'Sponsor',         'Member who personally sponsored others',           20, false),
  ('team_leader',     'Team Leader',     'Leads and develops a team',                        40, true),
  ('director',        'Director',        'Senior leader across teams',                       60, true),
  ('executive_admin', 'Executive Admin', 'Runs the organisation day to day',                 80, true),
  ('super_admin',     'Super Admin',     'Full control of the platform',                    100, true);

insert into public.permissions (key, description) values
  ('view_own_dashboard',            'View own dashboard'),
  ('view_team_dashboard',           'View authorized team dashboard'),
  ('view_direct_downlines',         'View direct downlines'),
  ('view_extended_downline',        'View extended downline network'),
  ('manage_office',                 'Manage assigned office'),
  ('view_authorized_financials',    'View authorized financial records'),
  ('approve_attendance_exceptions', 'Approve attendance exceptions'),
  ('review_member_goals',           'Review member goals'),
  ('approve_financial_transactions','Approve financial transactions'),
  ('publish_announcements',         'Publish announcements'),
  ('manage_content',                'Manage educational content'),
  ('manage_roles',                  'Manage role assignments'),
  ('view_org_analytics',            'View organization-wide analytics');

insert into public.role_permissions (role_id, permission_key)
select r.id, p.key
from public.roles r
join (values
  ('member',          'view_own_dashboard'),
  ('downline',        'view_own_dashboard'),
  ('sponsor',         'view_direct_downlines'),
  ('sponsor',         'review_member_goals'),
  ('upline',          'view_direct_downlines'),
  ('upline',          'view_extended_downline'),
  ('team_leader',     'view_team_dashboard'),
  ('team_leader',     'view_direct_downlines'),
  ('team_leader',     'view_extended_downline'),
  ('team_leader',     'review_member_goals'),
  ('team_leader',     'view_authorized_financials'),
  ('team_leader',     'approve_attendance_exceptions'),
  ('director',        'view_team_dashboard'),
  ('director',        'view_direct_downlines'),
  ('director',        'view_extended_downline'),
  ('director',        'review_member_goals'),
  ('director',        'view_authorized_financials'),
  ('director',        'approve_attendance_exceptions'),
  ('director',        'publish_announcements'),
  ('director',        'manage_office')
) as m(role_key, perm) on m.role_key = r.key
join public.permissions p on p.key = m.perm;

-- Executive and super admins receive every permission.
insert into public.role_permissions (role_id, permission_key)
select r.id, p.key from public.roles r cross join public.permissions p
where r.key in ('executive_admin', 'super_admin');

-- -----------------------------------------------------------------------------
-- Permission helpers. SECURITY DEFINER so they can read RBAC tables regardless
-- of the caller's RLS, but they only ever answer questions about auth.uid().
-- -----------------------------------------------------------------------------
create or replace function public.has_permission(perm text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and rp.permission_key = perm
      and p.status = 'active'
  )
$$;

create or replace function public.has_role(role_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = role_key
  )
$$;

create or replace function public.my_max_rank()
returns smallint language sql stable security definer set search_path = public as $$
  select coalesce(max(r.rank), 0)::smallint
  from public.user_roles ur join public.roles r on r.id = ur.role_id
  where ur.user_id = auth.uid()
$$;

create or replace function public.my_permissions()
returns setof text language sql stable security definer set search_path = public as $$
  select distinct rp.permission_key
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where ur.user_id = auth.uid() and p.status = 'active'
$$;

-- -----------------------------------------------------------------------------
-- Team hierarchy: closure table over profiles.sponsor_id.
-- One row per (ancestor, descendant) pair, including depth 0 for self.
-- -----------------------------------------------------------------------------
create table public.team_relationships (
  ancestor_id   uuid not null references public.profiles (id) on delete cascade,
  descendant_id uuid not null references public.profiles (id) on delete cascade,
  depth         integer not null check (depth >= 0),
  primary key (ancestor_id, descendant_id)
);
create index team_rel_descendant_idx on public.team_relationships (descendant_id, depth);
create index team_rel_ancestor_depth_idx on public.team_relationships (ancestor_id, depth);

create or replace function public.profiles_prevent_cycle() returns trigger
language plpgsql as $$
begin
  if new.sponsor_id is not null and exists (
    select 1 from public.team_relationships
    where ancestor_id = new.id and descendant_id = new.sponsor_id
  ) then
    raise exception 'A member cannot be sponsored by someone in their own downline'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

create trigger profiles_prevent_cycle
  before update of sponsor_id on public.profiles
  for each row when (new.sponsor_id is distinct from old.sponsor_id)
  execute function public.profiles_prevent_cycle();

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
