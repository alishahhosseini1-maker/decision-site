-- Migration: Add round_type column to lumen_evidence
-- Run this in Supabase SQL Editor

-- Add the column
ALTER TABLE lumen_evidence
ADD COLUMN IF NOT EXISTS round_type VARCHAR(50);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_lumen_evidence_round_type
ON lumen_evidence(round_type)
WHERE round_type IS NOT NULL;

-- Backfill: Parse round type from existing Funding evidence
UPDATE lumen_evidence
SET round_type =
  CASE
    -- Explicit round types (in order of specificity)
    WHEN description ILIKE '%series f%' OR description ILIKE '%series-f%' THEN 'Series F'
    WHEN description ILIKE '%series e%' OR description ILIKE '%series-e%' THEN 'Series E'
    WHEN description ILIKE '%series d%' OR description ILIKE '%series-d%' THEN 'Series D'
    WHEN description ILIKE '%series c%' OR description ILIKE '%series-c%' THEN 'Series C'
    WHEN description ILIKE '%series b%' OR description ILIKE '%series-b%' THEN 'Series B'
    WHEN description ILIKE '%series a%' OR description ILIKE '%series-a%' THEN 'Series A'
    WHEN description ILIKE '%pre-seed%' OR description ILIKE '%preseed%' THEN 'Pre-Seed'
    WHEN description ILIKE '%seed%' THEN 'Seed'
    WHEN description ILIKE '%ipo%' OR description ILIKE '%initial public offering%' THEN 'IPO'
    -- Leave as NULL if no explicit round type found
    ELSE NULL
  END
WHERE category = 'Funding'
AND round_type IS NULL;

-- Summary: Show what was parsed
SELECT
  round_type,
  COUNT(*) as count
FROM lumen_evidence
WHERE category = 'Funding'
GROUP BY round_type
ORDER BY
  CASE round_type
    WHEN 'Pre-Seed' THEN 1
    WHEN 'Seed' THEN 2
    WHEN 'Series A' THEN 3
    WHEN 'Series B' THEN 4
    WHEN 'Series C' THEN 5
    WHEN 'Series D' THEN 6
    WHEN 'Series E' THEN 7
    WHEN 'Series F' THEN 8
    WHEN 'IPO' THEN 9
    ELSE 10
  END;
