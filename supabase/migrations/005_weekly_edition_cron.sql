-- ============================================================
-- Migration 005: Weekly edition generation — every Sunday 8am BRT
-- ============================================================
-- Schedule: 0 11 * * 0 = Sunday at 11:00 UTC = 08:00 BRT
--
-- The CRON_SECRET below must match the Edge Function secret
-- with the same name. Set it via:
--   Supabase Dashboard > Edge Functions > Secrets > Add CRON_SECRET
--
-- Value: REPLACE_CRON_SECRET_AFTER_DEPLOY

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove existing job if any
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'weekly_generate_edition';

-- Schedule: every Sunday at 11:00 UTC (08:00 BRT)
SELECT cron.schedule(
  'weekly_generate_edition',
  '0 11 * * 0',
  $$
    SELECT net.http_post(
      url := 'https://vpwhjzbkaksnvdszrfuu.supabase.co/functions/v1/generate-edition',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "REPLACE_CRON_SECRET_AFTER_DEPLOY"}'::jsonb,
      body := '{}'::jsonb
    );
  $$
);
