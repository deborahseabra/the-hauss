-- ============================================================
-- Migration 020: Email templates (cron emails editable in Admin)
-- ============================================================
-- Templates used by: letter-open-reminder, generate-reflections.
-- Admin can edit html_content in Admin > Email templates.

CREATE TABLE IF NOT EXISTS email_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  html_content TEXT NOT NULL,
  placeholders_doc TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email_templates"
  ON email_templates FOR ALL USING (public.is_admin());

COMMENT ON TABLE email_templates IS 'HTML email templates for cron-triggered emails; editable in Admin';

-- Seed: letter_open (Letter to Self), weekly_reflection (Weekly Reflection)
INSERT INTO email_templates (id, name, description, html_content, placeholders_doc) VALUES
(
  'letter_open',
  'Letter to Self',
  'Sent when a letter to self opens (cron: letter-open-reminder).',
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your letter is ready to open</title></head><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #121212;"><div style="border-top: 4px solid #c41e1e; padding-top: 16px;"></div><h1 style="font-size: 18px; font-weight: 700; margin: 16px 0;">The Hauss</h1><p style="font-size: 15px; line-height: 1.6; color: #333;">A letter you wrote {{letter_written_date}} has just opened.</p><p style="margin-top: 24px;"><a href="{{letter_url}}" style="display: inline-block; padding: 12px 20px; background: #121212; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px;">Open your letter</a></p><p style="margin-top: 32px; font-size: 12px; color: #666;">The Hauss</p></body></html>',
  '{{letter_url}} — full URL to the letter (e.g. https://thehauss.me/entry/<id>). {{letter_written_date}} — e.g. "on February 14, 2025" or "to yourself".'
),
(
  'weekly_reflection',
  'Weekly Reflection',
  'Sent after weekly reflection is generated (cron: generate-reflections, period_type=week).',
  '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{title}}</title></head><body style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #121212;"><div style="border-top: 4px solid #c41e1e; padding-top: 16px;"></div><h1 style="font-size: 18px; font-weight: 700; margin: 16px 0;">The Hauss</h1><h2 style="font-size: 20px; font-weight: 700; margin: 24px 0;">{{title}}</h2><p style="font-size: 15px; line-height: 1.6; color: #333;">{{excerpt}}</p><p style="margin-top: 24px;"><a href="{{app_url}}/#/reflections" style="display: inline-block; padding: 12px 20px; background: #121212; color: #fff; text-decoration: none; font-weight: 600; font-size: 14px;">Read your full reflection →</a></p><p style="margin-top: 32px; font-size: 12px; color: #666;">The Hauss</p></body></html>',
  '{{title}} — reflection title. {{excerpt}} — first ~200 chars (HTML). {{app_url}} — base app URL.'
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  placeholders_doc = EXCLUDED.placeholders_doc,
  updated_at = now();
-- Note: ON CONFLICT does not overwrite html_content so existing edits are kept
