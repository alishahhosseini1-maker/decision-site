#!/usr/bin/env node

/**
 * Check if Tier 2 benchmark companies were affected by parser bug
 * Measure impact on original benchmark results
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const tier2Companies = ['Plaid', 'Anduril', 'Notion', 'Faire', 'Rippling'];

console.log('========================================');
console.log('TIER 2 BENCHMARK - PARSER IMPACT AUDIT');
console.log('========================================\n');

console.log('Checking if original benchmark was affected by millions parser bug...\n');

const affectedCompanies = [];

for (const companyName of tier2Companies) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .ilike('name', `%${companyName}%`)
    .single();

  if (!company) {
    console.log(`⚠️  ${companyName}: Not found`);
    continue;
  }

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('date, description, value, created_at')
    .eq('company_id', company.id)
    .eq('category', 'Funding')
    .order('date', { ascending: true });

  // Check if any evidence has millions in description
  const hasMillions = evidence?.some(e =>
    e.description.match(/\$\s*[\d,.]+\s*[M](?:illion)?\s+(?:post-money|valuation)/i)
  );

  // Count how many now have values vs before
  const withValues = evidence?.filter(e => e.value !== null && e.value !== 'null').length || 0;
  const total = evidence?.length || 0;

  console.log(`${company.name}:`);
  console.log(`  Total funding evidence: ${total} items`);
  console.log(`  Now with valuations: ${withValues}/${total} (${Math.round(withValues/total*100)}%)`);
  console.log(`  Contains millions: ${hasMillions ? 'YES - AFFECTED BY BUG' : 'NO'}`);

  if (hasMillions) {
    console.log(`\n  Examples of millions evidence:`);
    evidence?.filter(e => e.description.match(/\$\s*[\d,.]+\s*[M](?:illion)?\s+(?:post-money|valuation)/i))
      .slice(0, 3)
      .forEach(e => {
        const status = (e.value !== null && e.value !== 'null') ? `✓ ${e.value}B` : '✗ was NULL';
        console.log(`    [${e.date}] ${status}`);
        console.log(`      ${e.description.substring(0, 70)}...`);
      });

    affectedCompanies.push({
      name: company.name,
      id: company.id,
      total,
      withValues
    });
  }

  console.log();
}

console.log('========================================');
console.log('IMPACT ASSESSMENT');
console.log('========================================\n');

if (affectedCompanies.length === 0) {
  console.log('✓ No Tier 2 benchmark companies were affected by parser bug');
  console.log('  All had billions-denominated valuations only');
  console.log('  Original benchmark results remain valid');
} else {
  console.log(`⚠️  ${affectedCompanies.length}/${tier2Companies.length} Tier 2 companies were affected by parser bug\n`);

  affectedCompanies.forEach(c => {
    console.log(`  ${c.name}: ${c.withValues}/${c.total} now have values`);
  });

  console.log('\nAction required:');
  console.log('  1. Re-run valuations for affected companies');
  console.log('  2. Compare new results to original benchmark');
  console.log('  3. Update benchmark conclusions if results changed significantly');
}

console.log();
