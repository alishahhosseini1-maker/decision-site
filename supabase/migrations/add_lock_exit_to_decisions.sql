-- Add lock and exit columns to decisions table
ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS lock TEXT,
ADD COLUMN IF NOT EXISTS exit TEXT;
