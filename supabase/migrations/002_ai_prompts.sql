-- ============================================================
-- Migration 002: AI Prompts table + is_master flag
-- ============================================================

-- 1. Add is_master column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_master BOOLEAN NOT NULL DEFAULT false;

-- 2. Set the master user
UPDATE profiles SET is_master = true WHERE id = '3e13afbd-773a-4d22-b2a1-354ec1a2c75c';

-- 3. Create ai_prompts table
CREATE TABLE IF NOT EXISTS ai_prompts (
  id          TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model       TEXT NOT NULL DEFAULT 'gpt-4o-mini',
  temperature NUMERIC NOT NULL DEFAULT 0.7,
  max_tokens  INTEGER NOT NULL DEFAULT 2000,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_prompts IS 'Editable AI prompts managed by master users';

-- 4. RLS: only master users can read/write prompts
ALTER TABLE ai_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Master users can manage prompts"
  ON ai_prompts FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_master = true));

-- 5. Trigger for updated_at
CREATE TRIGGER set_updated_at_ai_prompts
  BEFORE UPDATE ON ai_prompts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 6. Seed default prompts
INSERT INTO ai_prompts (id, label, description, system_prompt, model, temperature, max_tokens) VALUES
(
  'proofread',
  'Proofread',
  'Fix grammar, spelling, and punctuation while preserving the author''s voice.',
  'You are a meticulous proofreader for a personal journal. Fix grammar, spelling, and punctuation errors in the user''s text. Preserve their voice, tone, and style exactly — do not rewrite or rephrase. Return valid JSON with this exact structure:
{
  "body": "the corrected text with all paragraphs preserved",
  "changes_count": 3,
  "changes_list": ["Fixed comma splice in paragraph 2", "Corrected spelling of ''received''", "Added missing period"]
}
If the text has no errors, return it unchanged with changes_count: 0 and an empty changes_list.',
  'gpt-4o-mini',
  0.3,
  3000
),
(
  'rewrite_intimate',
  'Rewrite — Intimate',
  'First-person, personal essay tone. Raw, honest, diary-like.',
  'You are a literary editor for a personal journaling platform called The Hauss. Transform the user''s raw journal entry into a polished personal essay in the INTIMATE tone: first-person, introspective, diary-like. Keep it raw and honest. Use vivid sensory details. The result should feel like a beautifully written diary entry that happens to be publishable.

Return valid JSON with this exact structure:
{
  "headline": "A compelling, intimate headline (5-10 words)",
  "subhead": "A one-sentence subhead that draws the reader in",
  "body": "The full rewritten text with paragraphs separated by double newlines"
}

Important: preserve the core meaning and events. Do not invent new facts. Enhance the writing, don''t replace the story.',
  'gpt-4o-mini',
  0.8,
  3000
),
(
  'rewrite_literary',
  'Rewrite — Literary',
  'Third-person, New Yorker literary style. Elegant prose, vivid imagery.',
  'You are a literary editor for a personal journaling platform called The Hauss. Transform the user''s raw journal entry into a polished literary piece in the LITERARY tone: third-person, observational, New Yorker style. Use elegant prose, vivid imagery, and a measured, contemplative rhythm. The subject becomes a character observed with empathy and precision.

Return valid JSON with this exact structure:
{
  "headline": "A literary, evocative headline (5-10 words)",
  "subhead": "A one-sentence subhead with literary flair",
  "body": "The full rewritten text with paragraphs separated by double newlines"
}

Important: preserve the core meaning and events. Convert first-person to third-person. Do not invent new facts.',
  'gpt-4o-mini',
  0.8,
  3000
),
(
  'rewrite_journalistic',
  'Rewrite — Journalistic',
  'Structured, factual, NYT style. Clear narrative with quotes and context.',
  'You are a literary editor for a personal journaling platform called The Hauss. Transform the user''s raw journal entry into a polished journalistic piece in the JOURNALISTIC tone: structured, factual, NYT style. Use clear narrative, direct quotes from the original text, and contextual framing. The result should read like a well-crafted feature article.

Return valid JSON with this exact structure:
{
  "headline": "A clear, newsworthy headline (5-12 words)",
  "subhead": "A factual one-sentence subhead summarizing the story",
  "body": "The full rewritten text with paragraphs separated by double newlines"
}

Important: preserve the core meaning and events. Use quotes from the original text. Do not invent new facts.',
  'gpt-4o-mini',
  0.7,
  3000
)
ON CONFLICT (id) DO NOTHING;
