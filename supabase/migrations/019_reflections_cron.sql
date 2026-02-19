-- ============================================================
-- Migration 019: Reflections cron jobs (weekly, monthly, quarterly, yearly)
-- ============================================================
-- Schedules 4 jobs that call the generate-reflections Edge Function.
-- Replace YOUR_PROJECT_REF and YOUR_CRON_SECRET before running
-- (or run the equivalent from docs/CRON_SECRET_SETUP.md with your values).

-- Unschedule if already present (idempotent)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'weekly_reflections';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'monthly_reflections';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'quarterly_reflections';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'yearly_reflections';

-- Weekly: Sunday 23:59 UTC
SELECT cron.schedule(
  'weekly_reflections',
  '59 23 * * 0',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"week"}'::jsonb
    );
  $$
);

-- Monthly: 1st of month at 01:00 UTC
SELECT cron.schedule(
  'monthly_reflections',
  '0 1 1 * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"month"}'::jsonb
    );
  $$
);

-- Quarterly: 1 Jan, Apr, Jul, Oct at 02:00 UTC
SELECT cron.schedule(
  'quarterly_reflections',
  '0 2 1 1,4,7,10 *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"quarter"}'::jsonb
    );
  $$
);

-- Yearly: 1 January at 03:00 UTC
SELECT cron.schedule(
  'yearly_reflections',
  '0 3 1 1 *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-reflections',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{"period_type":"year"}'::jsonb
    );
  $$
);
