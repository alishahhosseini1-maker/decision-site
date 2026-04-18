ALTER TABLE decisions
ADD COLUMN IF NOT EXISTS readiness_rationale_clarity TEXT,
ADD COLUMN IF NOT EXISTS readiness_rationale_assumptions TEXT,
ADD COLUMN IF NOT EXISTS readiness_rationale_reversibility TEXT,
ADD COLUMN IF NOT EXISTS readiness_rationale_risk TEXT,
ADD COLUMN IF NOT EXISTS readiness_rationale_exit_logic TEXT;
