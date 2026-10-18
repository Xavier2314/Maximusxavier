-- =============================================================================
-- MAXIMUS — 0035 Keep browser error reports (Vercel's free plan keeps logs for 1 hour)
-- Written only by the server (service role); readable by Super Admins.
-- =============================================================================
create table public.client_errors (
  id         bigint generated always as identity primary key,
  message    text,
  name       text,
  digest     text,
  url        text,
  stack      text,
  user_agent text,
  user_id    uuid,
  created_at timestamptz not null default now()
);
create index client_errors_created_idx on public.client_errors (created_at desc);
alter table public.client_errors enable row level security;
create policy client_errors_admin_read on public.client_errors for select to authenticated using (has_role('super_admin'));
revoke insert, update, delete on public.client_errors from anon, authenticated;
