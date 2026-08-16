-- Add column to track the amount raised in the last funding round

ALTER TABLE lumen_companies
ADD COLUMN IF NOT EXISTS last_round_raised NUMERIC;

COMMENT ON COLUMN lumen_companies.last_round_raised IS 'Amount raised in the last funding round (in billions)';
