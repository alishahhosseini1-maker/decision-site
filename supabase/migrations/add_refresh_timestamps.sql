-- Add timestamps for background refresh tracking

ALTER TABLE lumen_companies
ADD COLUMN IF NOT EXISTS last_researched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_valuation_at TIMESTAMPTZ;

-- Create index for cron query (ORDER BY last_researched_at)
CREATE INDEX IF NOT EXISTS lumen_companies_last_researched_idx
ON lumen_companies(last_researched_at NULLS FIRST);

COMMENT ON COLUMN lumen_companies.last_researched_at IS 'Last time Perplexity research ran for this company';
COMMENT ON COLUMN lumen_companies.last_valuation_at IS 'Last time AI valuation was generated';
