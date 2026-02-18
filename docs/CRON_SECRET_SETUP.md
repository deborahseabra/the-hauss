# Cron secret setup

The cron jobs that call Edge Functions (`generate-edition`, `letter-open-reminder`) must send a shared secret in the `x-cron-secret` header. The migrations do **not** contain the real secret (to avoid exposing it in git).

## If a secret was exposed (e.g. GitGuardian alert)

1. **Rotate immediately**
   - Generate a new secret, e.g.:
     ```bash
     python3 -c "import secrets; print(secrets.token_hex(32))"
     ```
   - In **Supabase Dashboard** → your project → **Project Settings** → **Edge Functions** → **Secrets**:
     - Update (or add) **CRON_SECRET** with this new value.
   - Then run the one-time SQL below in **SQL Editor**, replacing `YOUR_NEW_CRON_SECRET` and `YOUR_PROJECT_REF` with your new secret and your Supabase project reference (e.g. `vpwhjzbkaksnvdszrfuu`).

2. **Do not** commit the new secret to git. Use this doc and the SQL Editor only.

## One-time SQL after deploy or after rotating

Run this in **Supabase Dashboard → SQL Editor**, after replacing:

- `YOUR_CRON_SECRET` → the same value as the Edge Function secret **CRON_SECRET**
- `YOUR_PROJECT_REF` → your project ref (e.g. from the project URL: `https://YOUR_PROJECT_REF.supabase.co`)

```sql
-- Unschedule existing jobs (safe to run even if they don't exist)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'weekly_generate_edition';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'letter_open_reminder';

-- Weekly edition: Sunday 11:00 UTC (08:00 BRT)
SELECT cron.schedule(
  'weekly_generate_edition',
  '0 11 * * 0',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/generate-edition',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{}'::jsonb
    );
  $$
);

-- Letter open reminder: daily at 00:05 UTC
SELECT cron.schedule(
  'letter_open_reminder',
  '5 0 * * *',
  $$
    SELECT net.http_post(
      url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/letter-open-reminder',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'YOUR_CRON_SECRET'),
      body := '{}'::jsonb
    );
  $$
);
```

After running this, the crons will use your secret and the old one (if it was exposed) will no longer work.
