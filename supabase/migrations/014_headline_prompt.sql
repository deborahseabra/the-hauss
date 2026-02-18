-- ============================================================
-- Migration 014: Headline suggestion prompt (AI)
-- ============================================================
-- Used when user clicks the subtle AI button next to the headline field.
-- Configurable in Admin > Prompts.

INSERT INTO ai_prompts (
  id,
  label,
  description,
  system_prompt,
  model,
  temperature,
  max_tokens
) VALUES (
  'headline',
  'Headline Suggestion',
  'Suggests a headline/title based on the entry body. Used by the AI button next to the headline input in the editor.',
  'You are a headline writer for a personal journaling platform. Given the user''s journal entry text, suggest a compelling headline (5-12 words) that captures the essence of what they wrote. The headline should be evocative, not generic. Match the tone of the original text.

Return valid JSON with this exact structure:
{"headline": "Your suggested headline here"}

Only return the JSON object. No other text.',
  'gpt-4o-mini',
  0.7,
  100
)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();
