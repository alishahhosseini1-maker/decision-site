#!/usr/bin/env node

/**
 * Spot-check evidence quality for newly populated companies
 * Compare to original Tier 2 benchmark companies
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const newlyPopulated = ['Zipline', 'Perplexity', 'Discord'];
const tier2Benchmark = ['Plaid', 'Anduril', 'Notion']; // For comparison

console.log('========================================');
console.log('EVIDENCE QUALITY SPOT-CHECK');
console.log('========================================\n');

for (const groupName of ['Newly Populated', 'Tier 2 Benchmark']) {
  const companies = groupName === 'Newly Populated' ? newlyPopulated : tier2Benchmark;

  console.log(`${groupName} Companies:`);
  console.log('-'.repeat(80));

  for (const companyName of companies) {
    const { data: companyData } = await supabase
      .from('lumen_companies')
      .select('id, name')
      .ilike('name', `%${companyName}%`)
      .single();

    if (!companyData) {
      console.log(`\n${companyName}: NOT FOUND`);
      continue;
    }

    const { data: evidence } = await supabase
      .from('lumen_evidence')
      .select('category, description, source_type, source_label, status, date')
      .eq('company_id', companyData.id);

    const byCategory = {};
    evidence?.forEach(e => {
      if (!byCategory[e.category]) byCategory[e.category] = [];
      byCategory[e.category].push(e);
    });

    const verified = evidence?.filter(e => e.status === 'verified').length || 0;
    const pending = evidence?.filter(e => e.status === 'pending').length || 0;

    console.log(`\n${companyData.name}:`);
    console.log(`  Total: ${evidence?.length || 0} items (${verified} verified, ${pending} pending)`);
    console.log(`  Categories: ${Object.keys(byCategory).sort().join(', ') || 'none'}`);

    Object.keys(byCategory).sort().forEach(cat => {
      const items = byCategory[cat];
      console.log(`\n  ${cat} (${items.length} items):`);
      items.slice(0, 2).forEach(e => {
        const status = e.status === 'verified' ? '✓' : '○';
        console.log(`    ${status} [${e.date}] ${e.source_type} - ${e.description.substring(0, 70)}...`);
      });
      if (items.length > 2) {
        console.log(`    ... and ${items.length - 2} more`);
      }
    });
  }

  console.log('\n');
}

console.log('========================================');
console.log('QUALITY ASSESSMENT');
console.log('========================================\n');

console.log('Newly populated companies should have:');
console.log('  • 6+ evidence items (comparable to Tier 2)');
console.log('  • Mix of categories (Funding + at least 1-2 others)');
console.log('  • Reputable sources (Reputable Publication, Industry Research)');
console.log('  • Recent dates (within last 2-3 years for most items)');
console.log('\nIf significantly weaker than Tier 2, Perplexity research may need tuning.');
