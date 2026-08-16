-- Tracks whether Last round / Secondary implied on a company reflect a
-- human-confirmed evidence item, or just the best evidence found so far
-- (still unconfirmed).

ALTER TABLE lumen_companies
  ADD COLUMN IF NOT EXISTS last_round_confirmed BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS secondary_confirmed BOOLEAN NOT NULL DEFAULT false;

-- The three seeded companies' figures come from the original mockup data,
-- not from an evidence item in this ledger, so they don't fit the
-- confirmed/unconfirmed model cleanly either way. Leave them unconfirmed
-- (false) since that's the safer default — nothing in this ledger backs them.
