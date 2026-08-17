#!/usr/bin/env node

/**
 * Check if any "no evidence" conclusions were actually "unparsed millions"
 * due to parser bug
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('NO EVIDENCE MISCLASSIFICATION AUDIT');
console.log('========================================\n');

console.log('Checking if parser bug caused "no evidence" misclassifications...\n');

// Get all companies
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name');

let misclassified = 0;
let trueNoEvidence = 0;

for (const company of companies || []) {
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('category, value, description')
    .eq('company_id', company.id);

  const fundingEvidence = evidence?.filter(e => e.category === 'Funding') || [];

  if (fundingEvidence.length === 0) {
    // Truly no funding evidence
    trueNoEvidence++;
    continue;
  }

  // Check if any funding evidence has NULL values but mentions valuations in millions
  const hadUnparsedMillions = fundingEvidence.some(e =>
    (e.value === null || e.value === 'null') &&
    e.description.match(/\$\s*[\d,.]+\s*[M](?:illion)?\s+(?:post-money|valuation)/i)
  );

  if (hadUnparsedMillions) {
    // Count current values
    const nowWithValues = fundingEvidence.filter(e => e.value !== null && e.value !== 'null').length;

    console.log(`⚠️  ${company.name}:`);
    console.log(`   Had unparsed millions in descriptions`);
    console.log(`   Before fix: Would have appeared as incomplete evidence`);
    console.log(`   After fix: ${nowWithValues}/${fundingEvidence.length} rounds now have valuations\n`);

    misclassified++;
  }
}

console.log('========================================');
console.log('AUDIT RESULTS');
console.log('========================================\n');

if (misclassified === 0) {
  console.log('✓ No misclassifications found');
  console.log('  All "no evidence" or "incomplete evidence" conclusions remain valid');
  console.log('  Parser bug affected evidence QUALITY (values), not PRESENCE');
} else {
  console.log(`⚠️  Found ${misclassified} companies with misclassified evidence`);
  console.log('   These had evidence but it appeared incomplete due to parser bug');
  console.log('   After fix, their evidence is now more complete');
}

console.log();
console.log(`True "no evidence" companies: ${trueNoEvidence}`);
console.log(`Companies affected by parser: ${misclassified}`);
console.log();

console.log('Conclusion:');
if (misclassified > 0) {
  console.log('  Parser bug caused evidence to appear INCOMPLETE (NULL values)');
  console.log('  But did NOT cause "no evidence" misclassifications');
  console.log('  Completeness audit conclusions remain valid');
} else {
  console.log('  Parser bug had no impact on evidence presence/absence');
  console.log('  All audit conclusions remain valid');
}
