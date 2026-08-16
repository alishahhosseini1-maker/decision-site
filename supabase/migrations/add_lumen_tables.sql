-- Lumen: crowdsourced private-market evidence ledger + AI valuation

CREATE TABLE IF NOT EXISTS lumen_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  sector TEXT,
  last_round_value NUMERIC,
  last_round_date TEXT,
  secondary_value NUMERIC,
  secondary_date TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lumen_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES lumen_companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  value TEXT,
  source_type TEXT NOT NULL,
  source_label TEXT NOT NULL,
  date DATE NOT NULL,
  contributor TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'disputed', 'rejected')),
  verified_by TEXT[] NOT NULL DEFAULT '{}',
  dispute_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lumen_evidence_company_id_idx ON lumen_evidence(company_id);

CREATE TABLE IF NOT EXISTS lumen_valuations (
  company_id UUID PRIMARY KEY REFERENCES lumen_companies(id) ON DELETE CASCADE,
  bear_case NUMERIC,
  base_case NUMERIC,
  bull_case NUMERIC,
  confidence_score NUMERIC,
  key_drivers JSONB,
  explanation TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- All access goes through server-side API routes using the service role key.
-- Lock direct client (anon key) access out entirely via RLS.
ALTER TABLE lumen_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lumen_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE lumen_valuations ENABLE ROW LEVEL SECURITY;

-- Seed the three companies from the original mockup.
INSERT INTO lumen_companies (slug, name, symbol, sector, last_round_value, last_round_date, secondary_value, secondary_date)
VALUES
  ('shield', 'Shield AI', 'SHLD', 'Defense technology', 5.3, 'May 2024', 8.0, 'Nov 2025'),
  ('anthropic', 'Anthropic', 'ANTH', 'Foundation models', 61.5, 'Mar 2025', 170, 'Jul 2026'),
  ('spacex', 'SpaceX', 'SPCX', 'Aerospace', 350, 'Dec 2024', 400, 'Jun 2026')
ON CONFLICT (slug) DO NOTHING;

-- Seed evidence so the ledger isn't empty on first load.
INSERT INTO lumen_evidence (company_id, category, description, value, source_type, source_label, date, contributor, status, verified_by, dispute_note)
SELECT c.id, e.category, e.description, e.value, e.source_type, e.source_label, e.date::date, e.contributor, e.status, e.verified_by, e.dispute_note
FROM (VALUES
  ('shield', 'Funding', 'Series F closes, valuing the company near $5.3B', '$5.3B', 'Company Announcement', 'Shield AI press release', '2024-05-02', 'defense_analyst', 'verified', '{}'::text[], NULL),
  ('shield', 'Contracts', 'Awarded a multi-year USAF autonomy contract', '$200M+', 'SEC / Government Filing', 'SAM.gov contract record', '2025-02-18', 'gov_contracts_watch', 'verified', '{}'::text[], NULL),
  ('shield', 'Secondary market', 'Secondary share sale implies a higher valuation', '$8.0B implied', 'Verified Transaction', 'Forge Global data', '2025-11-03', 'secmarket_pro', 'verified', '{}'::text[], NULL),
  ('shield', 'Revenue', '2025 estimated revenue passes $200M on contract wins', '$200M+', 'Reputable Publication', 'TechCrunch', '2025-06-12', 'marketwatcher_99', 'verified', '{}'::text[], NULL),
  ('shield', 'Headcount', 'Engineering headcount grew roughly 35% year over year', '+35% YoY', 'Industry Research', 'LinkedIn hiring data', '2025-09-01', 'hiring_tracker', 'pending', '{}'::text[], NULL),
  ('shield', 'Rumor', 'Claim that Q1 revenue missed internal targets', NULL, 'Anonymous Tip', 'Anonymous submission', '2026-01-10', 'anon_247', 'disputed', '{}'::text[], 'No corroborating source found. Flagged by two reviewers.'),

  ('anthropic', 'Funding', 'Primary round closes at a $61.5B valuation', '$61.5B', 'Company Announcement', 'Company blog', '2025-03-03', 'vc_tracker', 'verified', '{}'::text[], NULL),
  ('anthropic', 'Revenue', 'Annualized revenue run-rate reportedly exceeds $9B', '$9B+', 'Reputable Publication', 'The Information', '2026-06-15', 'marketwatcher_99', 'verified', '{}'::text[], NULL),
  ('anthropic', 'Secondary market', 'Secondary transactions reported near a much higher mark', '$170B implied', 'Verified Transaction', 'EquityZen data', '2026-07-20', 'secmarket_pro', 'verified', '{}'::text[], NULL),
  ('anthropic', 'Contracts', 'Expanded enterprise agreement with a major cloud provider', NULL, 'Investor Document', 'Investor update memo', '2026-04-11', 'cloud_watcher', 'verified', '{}'::text[], NULL),
  ('anthropic', 'Retention', 'Enterprise renewal rates described as strong', NULL, 'Verified Employee', 'Verified current employee', '2026-05-01', 'insider_a2', 'pending', '{}'::text[], NULL),

  ('spacex', 'Funding', 'Tender offer values the company near $350B', '$350B', 'Company Announcement', 'Internal memo, reported', '2024-12-01', 'space_analyst', 'verified', '{}'::text[], NULL),
  ('spacex', 'Revenue', 'Starlink subscriber revenue estimated around $8B annualized', '$8B', 'Industry Research', 'Quilty Space report', '2025-10-01', 'orbit_watch', 'verified', '{}'::text[], NULL),
  ('spacex', 'Secondary market', 'Recent internal share sale implies a higher valuation', '$400B implied', 'Verified Transaction', 'Secondary marketplace filing', '2026-06-01', 'secmarket_pro', 'verified', '{}'::text[], NULL),
  ('spacex', 'Contracts', 'NASA contract awards total several billion over their term', '$4B+', 'SEC / Government Filing', 'USAspending.gov', '2025-08-01', 'gov_contracts_watch', 'verified', '{}'::text[], NULL),
  ('spacex', 'Rumor', 'Claim of Starship program delays affecting near-term value', NULL, 'Anonymous Tip', 'Anonymous submission', '2026-05-15', 'anon_88', 'disputed', '{}'::text[], 'Contradicted by public launch cadence data.')
) AS e(slug, category, description, value, source_type, source_label, date, contributor, status, verified_by, dispute_note)
JOIN lumen_companies c ON c.slug = e.slug
WHERE NOT EXISTS (SELECT 1 FROM lumen_evidence WHERE company_id = c.id);
