-- =============================================================================
-- MAXIMUS — 0030 Hourly accountability check-in reminders via pg_cron.
-- Vercel's free plan runs crons once a day, so the database schedules these.
-- Skipped quietly where pg_cron isn't available (e.g. local tests).
-- =============================================================================
do $do$
begin
  create extension if not exists pg_cron;
  perform cron.schedule('checkin-reminders', '5 * * * *', 'select public.run_checkin_reminders()');
exception when others then
  raise notice 'pg_cron not available; check-in reminders not scheduled';
end
$do$;
