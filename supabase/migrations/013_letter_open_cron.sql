-- ============================================================
-- Migration 013: Letter open reminder — daily cron
-- ============================================================
-- Runs daily at 00:05 UTC to find letters that open today,
-- create in-app notifications, and send emails (if RESEND_API_KEY set).

SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'letter_open_reminder';

SELECT cron.schedule(
  'letter_open_reminder',
  '5 0 * * *',
  $$
    SELECT net.http_post(
      url := 'https://vpwhjzbkaksnvdszrfuu.supabase.co/functions/v1/letter-open-reminder',
      headers := '{"Content-Type": "application/json", "x-cron-secret": "REPLACE_CRON_SECRET_AFTER_DEPLOY"}'::jsonb
      body := '{}'::jsonb
    );
  $$
);
