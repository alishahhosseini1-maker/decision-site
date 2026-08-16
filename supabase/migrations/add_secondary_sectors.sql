-- Add secondary_sectors array to support multi-category companies
ALTER TABLE lumen_companies
ADD COLUMN IF NOT EXISTS secondary_sectors TEXT[] DEFAULT '{}';

COMMENT ON COLUMN lumen_companies.secondary_sectors IS 'Optional secondary sector tags (e.g., Stripe = Fintech + Infrastructure & Cloud)';
