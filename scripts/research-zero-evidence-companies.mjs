#!/usr/bin/env node

/**
 * Manually trigger research for all companies with zero evidence
 * Uses the research API endpoint
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || 'https://decisionlayer.dev';

console.log('========================================');
console.log('RESEARCHING ZERO-EVIDENCE COMPANIES');
console.log('========================================\n');

// Get companies with zero evidence
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('*');

const zeroEvidenceCompanies = [];
for (const company of companies || []) {
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('id')
    .eq('company_id', company.id);

  if ((evidence?.length || 0) === 0) {
    zeroEvidenceCompanies.push(company);
  }
}

console.log(`Found ${zeroEvidenceCompanies.length} companies with zero evidence\n`);

if (zeroEvidenceCompanies.length === 0) {
  console.log('✓ All companies have evidence');
  process.exit(0);
}

let successCount = 0;
let errorCount = 0;
const results = [];

for (const company of zeroEvidenceCompanies) {
  try {
    console.log(`\nResearching: ${company.name}...`);

    // Trigger research via API
    const researchResponse = await fetch(`${SITE_URL}/api/lumen/companies/${company.id}/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!researchResponse.ok) {
      throw new Error(`Research API failed: ${researchResponse.statusText}`);
    }

    const researchData = await researchResponse.json();
    const evidenceCount = researchData.evidence?.length || 0;
    console.log(`  Found ${evidenceCount} evidence items`);

    // Trigger valuation if we have evidence
    if (evidenceCount > 0) {
      const valuationResponse = await fetch(`${SITE_URL}/api/lumen/companies/${company.id}/valuation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (valuationResponse.ok) {
        const valuationData = await valuationResponse.json();
        const val = valuationData.valuation;
        if (val) {
          console.log(`  Generated valuation: $${val.base_case}B (confidence: ${val.confidence_score}/100)`);
        }
      }
    } else {
      console.log(`  ⚠️  No evidence found (company may be too obscure or misspelled)`);
    }

    successCount++;
    results.push({
      company: company.name,
      status: 'success',
      evidenceCount
    });

    // Rate limit: 2 seconds between companies
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (err) {
    console.error(`  ❌ Error: ${err.message}`);
    errorCount++;
    results.push({
      company: company.name,
      status: 'error',
      error: err.message
    });
  }
}

console.log('\n========================================');
console.log('RESEARCH COMPLETE');
console.log('========================================\n');
console.log(`Successful: ${successCount}`);
console.log(`Errors: ${errorCount}`);
console.log();

// Summary
const withEvidence = results.filter(r => r.evidenceCount > 0).length;
const noEvidence = results.filter(r => r.evidenceCount === 0).length;
const errors = results.filter(r => r.status === 'error').length;

console.log('Results:');
console.log(`  ${withEvidence} companies now have evidence`);
console.log(`  ${noEvidence} companies still have no evidence (too obscure)`);
console.log(`  ${errors} companies had errors`);

if (noEvidence > 0) {
  console.log('\nCompanies with no evidence found:');
  results.filter(r => r.evidenceCount === 0 && r.status === 'success').forEach(r => {
    console.log(`  - ${r.company}`);
  });
}
