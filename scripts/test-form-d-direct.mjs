#!/usr/bin/env node

/**
 * Direct test of Form D integration (no HTTP, calls function directly)
 */

import { createClient } from '@supabase/supabase-js';
import { addFormDEvidence } from '../app/lib/sec-edgar.js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('FORM D INTEGRATION DIRECT TEST');
console.log('========================================\n');

// Test on one company first
const testCompany = 'Stripe';

console.log(`Testing: ${testCompany}\n`);

// Find company
const { data: company } = await supabase
  .from('lumen_companies')
  .select('*')
  .ilike('name', `%${testCompany}%`)
  .single();

if (!company) {
  console.log('❌ Company not found');
  process.exit(1);
}

console.log(`Found: ${company.name} (ID: ${company.id})\n`);

// Get current evidence
const { data: evidenceBefore } = await supabase
  .from('lumen_evidence')
  .select('category, source_type')
  .eq('company_id', company.id)
  .eq('category', 'Funding');

console.log(`Current funding evidence: ${evidenceBefore?.length || 0} items`);
const formDBefore = evidenceBefore?.filter(e => e.source_type === 'SEC / Government Filing').length || 0;
console.log(`  SEC Form D items: ${formDBefore}\n`);

// Run Form D integration
console.log('Fetching Form D filings from SEC EDGAR...\n');

try {
  const addedCount = await addFormDEvidence(supabase, company.id, company.name);

  console.log(`\n✓ Form D integration complete`);
  console.log(`  Added: ${addedCount} new evidence items\n`);

  // Get updated evidence
  const { data: evidenceAfter } = await supabase
    .from('lumen_evidence')
    .select('date, description, source_type, citation_url')
    .eq('company_id', company.id)
    .eq('source_type', 'SEC / Government Filing')
    .order('date', { ascending: false });

  if (evidenceAfter && evidenceAfter.length > 0) {
    console.log(`Form D evidence (${evidenceAfter.length} total):`);
    evidenceAfter.forEach(e => {
      console.log(`  [${e.date}] ${e.description.substring(0, 70)}...`);
      console.log(`    URL: ${e.citation_url}`);
    });
  } else {
    console.log('No Form D filings found for this company');
    console.log('(Company may not file Form D, or is not in SEC database)');
  }

} catch (err) {
  console.error(`❌ Error: ${err.message}`);
  console.error(err.stack);
}

console.log('\n========================================');
console.log('TEST ASSESSMENT');
console.log('========================================\n');

console.log('Form D integration provides:');
console.log('  ✓ Filing dates (for corroboration)');
console.log('  ✓ SEC URLs (for verification)');
console.log('  ✓ High credibility (official government filing)');
console.log('\nForm D does NOT provide (MVP):');
console.log('  ✗ Amount raised (requires XML parsing)');
console.log('  ✗ Post-money valuation (not on form)');
console.log('\nValue assessment: LIMITED - corroboration only, not gap-filling');
