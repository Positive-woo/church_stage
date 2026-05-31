-- Existing Supabase projects: run this once in SQL Editor.
ALTER TABLE items
ADD COLUMN IF NOT EXISTS detail_name TEXT NOT NULL DEFAULT '';
