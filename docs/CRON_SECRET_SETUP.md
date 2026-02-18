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

---

## Removing the exposed secret from Git history (optional)

After rotating the secret, you can rewrite Git history so the old value no longer appears in any commit on GitHub. This changes commit hashes, so anyone who cloned the repo should re-clone after you force-push.

1. **Backup** (optional but recommended):
   ```bash
   git clone https://github.com/deborahseabra/the-hauss.git the-hauss-backup
   ```

2. **Install git-filter-repo** (one of):
   ```bash
   brew install git-filter-repo
   # or: pip install git-filter-repo
   ```

3. **From your repo root**, replace the old secret in all history with a placeholder:
   ```bash
   git filter-repo --replace-text <(echo 'REPLACE_CRON_SECRET_AFTER_DEPLOY==>REPLACE_CRON_SECRET_AFTER_DEPLOY') --force
   ```
   (`--force` is needed because the tool avoids rewriting repos that have remotes.)

4. **Re-add the GitHub remote** (filter-repo removes remotes):
   ```bash
   git remote add origin https://github.com/deborahseabra/the-hauss.git
   ```

5. **Force-push** to overwrite history on GitHub:
   ```bash
   git push --force --all origin
   git push --force --tags origin
   ```

After this, the old secret will no longer appear in the repo history. You still must have rotated the secret (new value in Supabase and in the cron SQL) — removing from history only cleans up the leaked value from the past.
