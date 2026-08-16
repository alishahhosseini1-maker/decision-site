-- Comparable companies cache
CREATE TABLE IF NOT EXISTS lumen_comps (
  company_id UUID REFERENCES lumen_companies(id) ON DELETE CASCADE,
  comp_name TEXT NOT NULL,
  comp_slug TEXT NOT NULL,
  comp_valuation NUMERIC,
  comp_revenue NUMERIC,
  comp_revenue_multiple NUMERIC,
  sector TEXT,
  similarity_score INTEGER, -- 0-100, how similar to target company
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (company_id, comp_slug)
);

CREATE INDEX lumen_comps_company_idx ON lumen_comps(company_id);
CREATE INDEX lumen_comps_computed_at_idx ON lumen_comps(computed_at);

COMMENT ON TABLE lumen_comps IS 'Cached comparable companies, computed during cron refresh';
COMMENT ON COLUMN lumen_comps.similarity_score IS 'How similar this comp is to the target company (0-100)';

-- Conflict of interest tracking
ALTER TABLE lumen_evidence
ADD COLUMN IF NOT EXISTS affiliation_disclosed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS affiliation_type TEXT, -- 'employee', 'investor', 'founder', 'advisor', 'competitor'
ADD COLUMN IF NOT EXISTS citation_url TEXT; -- Required for AI research

-- Make citation_url required for AI research (enforced at application level)
COMMENT ON COLUMN lumen_evidence.citation_url IS 'Required for AI-sourced evidence to enable fact-checking';
COMMENT ON COLUMN lumen_evidence.affiliation_disclosed IS 'Whether contributor disclosed affiliation with the company';
COMMENT ON COLUMN lumen_evidence.affiliation_type IS 'Type of affiliation: employee, investor, founder, advisor, competitor';

-- Track valuation changes for delta/trend calculation
CREATE TABLE IF NOT EXISTS lumen_valuation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES lumen_companies(id) ON DELETE CASCADE NOT NULL,
  valuation_type TEXT NOT NULL, -- 'last_round', 'secondary', 'ai_estimated'
  value NUMERIC NOT NULL,
  date TEXT NOT NULL,
  source TEXT, -- What caused this snapshot (e.g., 'cron_refresh', 'manual_research', 'evidence_confirmation')
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX lumen_valuation_history_company_idx ON lumen_valuation_history(company_id);
CREATE INDEX lumen_valuation_history_date_idx ON lumen_valuation_history(date DESC);

COMMENT ON TABLE lumen_valuation_history IS 'Snapshots of valuations over time for delta/trend analysis';
