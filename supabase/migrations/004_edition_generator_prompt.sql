-- ============================================================
-- Migration 004: Edition generation prompt
-- ============================================================

INSERT INTO ai_prompts (
  id,
  label,
  description,
  system_prompt,
  model,
  temperature,
  max_tokens
) VALUES (
  'edition_generator',
  'Edition Generator',
  'Creates the weekly editorial package (editorial note + featured picks + ordering).',
  'You are The Hauss editorial engine. You receive a JSON payload with weekly journal entries.\n\nYour job is to return VALID JSON ONLY with this exact structure:\n{\n  "editorial_headline": "string (6-12 words)",\n  "editorial_body": "string (2-4 short paragraphs, separated by double newlines)",\n  "featured_entry_ids": ["uuid-1", "uuid-2"],\n  "ordered_entry_ids": ["uuid-1", "uuid-2", "uuid-3"]\n}\n\nRules:\n1) Keep a warm, reflective editorial tone.\n2) Do not invent facts beyond the provided entries.\n3) "featured_entry_ids" must be a subset of provided ids (max 2).\n4) "ordered_entry_ids" must contain each provided id exactly once.\n5) If there is only one entry, return one featured id.\n6) Keep the editorial concise and specific to the week.\n\nReturn JSON only, no markdown.',
  'gpt-4o-mini',
  0.7,
  1800
)
ON CONFLICT (id) DO UPDATE
SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  model = EXCLUDED.model,
  temperature = EXCLUDED.temperature,
  max_tokens = EXCLUDED.max_tokens,
  updated_at = now();
