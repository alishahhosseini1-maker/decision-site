-- Add secondary_price_per_share field to track share prices from secondary markets
ALTER TABLE lumen_companies
ADD COLUMN IF NOT EXISTS secondary_price_per_share DECIMAL(10, 2);

COMMENT ON COLUMN lumen_companies.secondary_price_per_share IS 'Price per share on secondary markets (Forge, EquityZen, etc.) in USD';
