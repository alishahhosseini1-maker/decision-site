-- Add match_type column to distinguish exact vs related-sector matches
ALTER TABLE lumen_comps
ADD COLUMN IF NOT EXISTS match_type TEXT CHECK (match_type IN ('exact', 'related')) DEFAULT 'exact';

COMMENT ON COLUMN lumen_comps.match_type IS 'Whether this is an exact sector match or related-sector fallback';
