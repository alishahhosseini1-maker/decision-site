-- Reset Lumen with Top 20 Private Companies
-- Run this in Supabase SQL Editor

-- Step 1: Delete all existing companies (CASCADE deletes related evidence, valuations, etc.)
DELETE FROM lumen_companies;

-- Step 2: Insert Top 20 by Valuation (from Yahoo Finance)
-- All include: valuation, price per share, sector, symbol

INSERT INTO lumen_companies (
  slug,
  name,
  symbol,
  sector,
  secondary_value,
  secondary_price_per_share,
  secondary_confirmed,
  created_by
) VALUES
  -- 1. Anthropic - $965.0B
  ('anthropic', 'Anthropic', 'ANTH', 'Artificial Intelligence', 965.001, 589.01, true, 'system'),

  -- 2. OpenAI - $894.3B
  ('openai', 'OpenAI', 'OPAI', 'Artificial Intelligence', 894.326, 721.85, true, 'system'),

  -- 3. Databricks - $191.9B
  ('databricks', 'Databricks', 'DATB', 'Data and Analytics', 191.876, 264.90, true, 'system'),

  -- 4. Stripe - $184.4B
  ('stripe', 'Stripe', 'STRI', 'Financial Services', 184.401, 72.45, true, 'system'),

  -- 5. Anduril Industries - $115.0B
  ('anduril-industries', 'Anduril Industries', 'ANIN', 'Government and Military', 115.037, 130.03, true, 'system'),

  -- 6. Ramp - $46.0B
  ('ramp', 'Ramp', 'RAMP', 'Financial Services', 46.035, 125.55, true, 'system'),

  -- 7. Kalshi - $35.0B
  ('kalshi', 'Kalshi', 'KLSH', 'Financial Services', 35.0, 962.28, true, 'system'),

  -- 8. Neuralink - $28.7B
  ('neuralink', 'Neuralink', 'NEUR', 'Biotechnology', 28.663, 150.00, true, 'system'),

  -- 9. Crusoe - $26.7B
  ('crusoe', 'Crusoe', 'CUES', 'Energy', 26.728, 224.54, true, 'system'),

  -- 10. Fanatics - $21.8B
  ('fanatics', 'Fanatics', 'FANA', 'Commerce and Shopping', 21.774, 53.50, true, 'system'),

  -- 11. Perplexity - $19.7B
  ('perplexity', 'Perplexity', 'PEAI', 'Artificial Intelligence', 19.737, 67.31, true, 'system'),

  -- 12. Rippling - $18.9B
  ('rippling', 'Rippling', 'RIPP', 'Administrative Services', 18.94, 58.62, true, 'system'),

  -- 13. Ripple - $17.4B
  ('ripple', 'Ripple', 'RIPL', 'Blockchain and Crypto', 17.36, 105.56, true, 'system'),

  -- 14. Skild AI - $15.3B
  ('skild-ai', 'Skild AI', 'SKIA', 'Hardware', 15.312, 71.04, true, 'system'),

  -- 15. SandboxAQ - $13.9B
  ('sandboxaq', 'SandboxAQ', 'SAAQ', 'Privacy and Security', 13.888, 41.35, true, 'system'),

  -- 16. Shield AI - $13.6B
  ('shield-ai', 'Shield AI', 'SHAI', 'Government and Military', 13.573, 164.25, true, 'system'),

  -- 17. Polymarket - $13.4B
  ('polymarket', 'Polymarket', 'POLA', 'Blockchain and Crypto', 13.404, 135.91, true, 'system'),

  -- 18. Epic Games - $12.5B
  ('epic-games', 'Epic Games', 'EPGA', 'Media and Entertainment', 12.546, 334.55, true, 'system'),

  -- 19. Zipline - $11.3B
  ('zipline', 'Zipline', 'ZIPL', 'Supply Chain and Logistics', 11.328, 81.71, true, 'system'),

  -- 20. Discord - $11.1B
  ('discord', 'Discord', 'DISO', 'Messaging and Telecommunications', 11.101, 40.75, true, 'system');

-- Verify
SELECT COUNT(*) as total_companies FROM lumen_companies;
SELECT name, secondary_value, secondary_price_per_share, sector
FROM lumen_companies
ORDER BY secondary_value DESC
LIMIT 5;
