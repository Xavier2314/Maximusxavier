-- Accelerator Community website schema (Supabase / Postgres)
-- Run once in Supabase: SQL Editor > New query > paste > Run.
-- Row Level Security is enabled on every table with NO public policies: only the server
-- (service role key) can read or write. Nothing here is exposed to browsers.

create extension if not exists pgcrypto;

create table if not exists settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists ticket_types (
  id text primary key,
  name text not null,
  description text not null default '',
  price_kobo integer check (price_kobo is null or price_kobo > 0),
  currency text not null default 'NGN',
  sales_start timestamptz,
  sales_end timestamptz,
  benefits text[] not null default '{}',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_at timestamptz not null default now()
);

insert into ticket_types (id, name, description, sales_start, sales_end, sort_order) values
  ('early_bird', 'Early Bird', 'Register early for Accelerators Events 2026.', null, '2026-10-31T22:59:59.999Z', 1),
  ('late', 'Late Registration', 'Standard registration after the Early Bird window closes.', '2026-10-31T23:00:00Z', null, 2)
on conflict (id) do nothing;

create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  ticket_id text not null references ticket_types(id),
  full_name text not null,
  email text not null,
  phone text not null,
  city text,
  is_member text,
  organisation text,
  referral_source text,
  notes text,
  consent boolean not null default false,
  amount_kobo integer not null,
  currency text not null default 'NGN',
  status text not null default 'pending' check (status in ('pending','paid','failed','abandoned','duplicate_paid')),
  paystack_access_code text,
  paid_at timestamptz,
  channel text,
  gateway_response text,
  confirmation_sent_at timestamptz,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists registrations_one_paid_per_email on registrations (lower(email)) where status = 'paid';
create index if not exists registrations_status_idx on registrations (status);
create index if not exists registrations_email_idx on registrations (lower(email));

create table if not exists payment_events (
  id bigserial primary key,
  reference text,
  event text not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

create table if not exists speakers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  title text,
  bio text,
  topic text,
  photo_url text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists awards (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  nominees text,
  winners text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists contests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  requirements text,
  starts_at timestamptz,
  deadline timestamptz,
  status text not null default 'coming_soon' check (status in ('coming_soon','open','closed','winners_announced')),
  prize text,
  submission_url text,
  rules text,
  winners text,
  sort_order integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  topic text not null,
  message text not null,
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit (
  id bigserial primary key,
  actor text not null,
  action text not null,
  target text,
  details jsonb,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['settings','ticket_types','registrations','payment_events','speakers','awards','contests','contact_messages','admin_audit'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
