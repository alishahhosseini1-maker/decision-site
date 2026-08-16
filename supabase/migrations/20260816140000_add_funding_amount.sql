-- Add column to track the amount raised in each funding round
-- This is separate from 'value' which stores the post-money valuation

ALTER TABLE lumen_evidence
ADD COLUMN IF NOT EXISTS funding_amount DECIMAL(10, 2);

COMMENT ON COLUMN lumen_evidence.funding_amount IS 'Amount raised in this funding round (in billions). Separate from value which is the post-money valuation.';
