-- Migration 010: Add cover image URL to editions
ALTER TABLE editions ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
