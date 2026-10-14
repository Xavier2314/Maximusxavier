-- ════════════════════════════════════════════════════════════════════
-- MY RHYTHM — background scheduler (run ONCE in Supabase → SQL Editor)
--
-- Calls your deployed app every minute. The app then:
--   1. re-plans the next 48 hours of reminders, and
--   2. sends every reminder that is due via Web Push.
--
-- BEFORE RUNNING: replace the two placeholders below
--   YOUR-APP-URL     e.g. https://my-rhythm.vercel.app
--   YOUR-CRON-SECRET the exact CRON_SECRET value from your Vercel env vars
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- remove an older copy if you are re-running this script
select cron.unschedule(jobid) from cron.job where jobname = 'my-rhythm-tick';

select cron.schedule(
  'my-rhythm-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'YOUR-APP-URL/api/cron/tick',
    headers := jsonb_build_object('Authorization', 'Bearer YOUR-CRON-SECRET', 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Check it is running (should list recent runs with status 'succeeded'):
--   select * from cron.job_run_details order by start_time desc limit 10;
-- See the app's answers (status_code 200 = OK, 401 = wrong secret):
--   select id, status_code, content::text, created from net._http_response order by created desc limit 10;
