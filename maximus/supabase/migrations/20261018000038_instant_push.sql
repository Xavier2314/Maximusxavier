-- =============================================================================
-- MAXIMUS — 0038 Instant push
-- Every new notification asks the app to send its web push straight away
-- (via pg_net), instead of waiting for the daily sweep. The URL and token live
-- in private.push_dispatch (set outside migrations; never exposed via the API).
-- If pg_net or the config is missing, nothing breaks: the cron sweep still runs.
-- =============================================================================
do $do$ begin
  create extension if not exists pg_net;
exception when others then raise notice 'pg_net not available; instant push disabled';
end $do$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.push_dispatch (
  id    boolean primary key default true check (id),
  url   text not null,
  token text not null
);

create or replace function public.notifications_dispatch_push() returns trigger
language plpgsql security definer set search_path = public, private as $$
declare cfg private.push_dispatch%rowtype;
begin
  select * into cfg from private.push_dispatch where id;
  if not found or to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return null; end if;
  begin
    execute 'select net.http_post(url := $1, body := ''{}''::jsonb, headers := $2, timeout_milliseconds := 5000)'
      using cfg.url, jsonb_build_object('Authorization', 'Bearer ' || cfg.token, 'Content-Type', 'application/json');
  exception when others then null;  -- never block the notification itself
  end;
  return null;
end $$;

drop trigger if exists notifications_dispatch_push on public.notifications;
create trigger notifications_dispatch_push after insert on public.notifications
  for each statement execute function public.notifications_dispatch_push();
revoke execute on function public.notifications_dispatch_push() from public, anon, authenticated;
