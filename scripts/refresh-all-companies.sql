-- Fresh Start: Delete all evidence and re-research
-- This will re-populate all companies with properly parsed valuations
-- Run this in Supabase SQL Editor

-- Delete all existing evidence (will be re-researched with proper value extraction)
DELETE FROM lumen_evidence;

-- Verify
SELECT COUNT(*) as evidence_count FROM lumen_evidence;
SELECT COUNT(*) as companies_count FROM lumen_companies;

-- After running this:
-- 1. Refresh your site
-- 2. Click "Research this company" on each company you want populated
-- 3. Funding charts will appear automatically with proper valuations
