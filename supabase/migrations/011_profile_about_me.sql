-- Migration 011: Add about_me (bio) to profiles for user profile page
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS about_me TEXT;
