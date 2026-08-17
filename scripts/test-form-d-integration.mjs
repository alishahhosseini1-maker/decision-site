#!/usr/bin/env node

/**
 * Test Form D integration against companies with known funding gaps
 * Verify it corroborates/fills in missing data before systematic rollout
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = process.env.SITE_URL || 'https://decisionlayer.dev';

// Test cases: companies with known funding gaps
const testCompanies = [
  {
    name: 'Multiply Labs',
    expectedGap: 'Has funding rounds but missing post-money valuations',
    currentEvidenceCount: 6
  },
  {
    name: 'Stripe',
    expectedGap: 'Well-known company, should have multiple rounds to corroborate',
    currentEvidenceCount: 6
  },
  {
    name: 'Plaid',
    expectedGap: 'Known Series D ($13.4B), check if Form D corroborates',
    currentEvidenceCount: 12
  }
];

console.log('========================================');
console.log('FORM D INTEGRATION TEST');
console.log('========================================\n');

console.log('Testing against companies with known funding gaps...\n');

for (const testCase of testCompanies) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Expected gap: ${testCase.expectedGap}`);
  console.log(`Current evidence: ${testCase.currentEvidenceCount} items\n`);

  // Find company
  const { data: companyData } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .ilike('name', `%${testCase.name}%`)
    .single();

  if (!companyData) {
    console.log('❌ Company not found in database\n');
    continue;
  }

  console.log(`Found: ${companyData.name} (ID: ${companyData.id})\n`);

  // Get current evidence before Form D
  const { data: evidenceBefore } = await supabase
    .from('lumen_evidence')
    .select('category, date, description, source_type')
    .eq('company_id', companyData.id)
    .eq('category', 'Funding')
    .order('date', { ascending: false });

  console.log(`Current funding evidence (${evidenceBefore?.length || 0} items):`);
  evidenceBefore?.slice(0, 3).forEach(e => {
    console.log(`  [${e.date}] ${e.source_type}: ${e.description.substring(0, 60)}...`);
  });
  if ((evidenceBefore?.length || 0) > 3) {
    console.log(`  ... and ${evidenceBefore.length - 3} more`);
  }

  // Trigger Form D research via API endpoint
  console.log(`\nFetching Form D filings from SEC EDGAR...`);

  try {
    const response = await fetch(`${SITE_URL}/api/lumen/companies/${companyData.id}/research/form-d`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      console.log(`⚠️  Form D API not available (${response.status})`);
      console.log(`   Note: API endpoint needs to be created at /api/lumen/companies/[id]/research/form-d/route.ts`);
      continue;
    }

    const result = await response.json();
    const addedCount = result.addedCount || 0;

    console.log(`✓ Form D fetch complete: ${addedCount} new evidence items added`);

    if (addedCount === 0) {
      console.log(`  No new filings found (company may not file Form D, or all filings already captured)`);
    }

    // Get evidence after Form D
    const { data: evidenceAfter } = await supabase
      .from('lumen_evidence')
      .select('category, date, description, source_type')
      .eq('company_id', companyData.id)
      .eq('category', 'Funding')
      .order('date', { ascending: false });

    if (addedCount > 0) {
      console.log(`\nNew Form D evidence:`);
      const formDEvidence = evidenceAfter?.filter(e => e.source_type === 'SEC / Government Filing') || [];
      formDEvidence.forEach(e => {
        console.log(`  [${e.date}] SEC Form D: ${e.description.substring(0, 60)}...`);
      });
    }

  } catch (err) {
    console.log(`❌ Error: ${err.message}`);
  }

  // Rate limit between companies
  await new Promise(resolve => setTimeout(resolve, 2000));
}

console.log('\n========================================');
console.log('TEST COMPLETE');
console.log('========================================\n');

console.log('Next steps:');
console.log('1. Review results - did Form D add value for companies with gaps?');
console.log('2. If successful, create systematic integration (add to research flow)');
console.log('3. If not, document limitations and deprioritize Form D');
