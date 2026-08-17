-- Add CHECK constraint to require date for Secondary evidence category
-- Prevents the undated secondary value bugs that affected Rippling/Anduril

ALTER TABLE lumen_evidence
ADD CONSTRAINT secondary_requires_date
CHECK (category != 'Secondary' OR date IS NOT NULL);

-- Explanation:
-- This constraint ensures that any evidence item with category='Secondary'
-- MUST have a non-NULL date value. Other categories can still have NULL dates
-- if needed, but Secondary evidence (publicly-sourced secondary market data)
-- requires a date for proper staleness tracking and filtering.
