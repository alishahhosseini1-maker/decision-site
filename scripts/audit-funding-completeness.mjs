#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('========================================');
console.log('FUNDING COMPLETENESS AUDIT');
console.log('========================================\n');

// Get all companies with evidence
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name, sector, last_round_value, last_round_date');

console.log(`Total companies in database: ${companies?.length || 0}\n`);

// Analyze funding evidence completeness
const issues = {
  noFundingEvidence: [],
  fundingWithoutValuation: [],
  staleFunding: [], // >20 months old
  noMomentumEvidence: [],
  complete: []
};

const momentumCategories = ['Revenue', 'Headcount', 'Product', 'Contracts', 'Metrics'];

for (const company of companies || []) {
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('category, description, value, date, source_type')
    .eq('company_id', company.id);

  const funding = evidence?.filter(e => e.category === 'Funding') || [];
  const momentum = evidence?.filter(e => momentumCategories.includes(e.category)) || [];

  // Check for issues
  if (funding.length === 0) {
    issues.noFundingEvidence.push({
      name: company.name,
      totalEvidence: evidence?.length || 0
    });
    continue;
  }

  // Check if funding has valuations
  const fundingWithVal = funding.filter(e => {
    // Check if description mentions valuation or if value field is populated
    const hasVal = e.description.match(/\$[\d.]+\s*[Bb](illion)?.*valuation/i) ||
                   e.description.match(/valuation.*\$[\d.]+\s*[Bb]/i) ||
                   (e.value && parseFloat(e.value) > 0);
    return hasVal;
  });

  if (fundingWithVal.length === 0) {
    issues.fundingWithoutValuation.push({
      name: company.name,
      fundingCount: funding.length,
      example: funding[0].description.substring(0, 80)
    });
  }

  // Check staleness (most recent funding >20 months old)
  const mostRecent = funding.reduce((latest, e) =>
    e.date > latest.date ? e : latest
  );

  const now = new Date();
  const fundingDate = new Date(mostRecent.date);
  const monthsOld = Math.round((now - fundingDate) / (1000 * 60 * 60 * 24 * 30));

  if (monthsOld > 20) {
    issues.staleFunding.push({
      name: company.name,
      mostRecentDate: mostRecent.date,
      monthsOld,
      hasMomentum: momentum.length > 0
    });
  }

  // Check momentum evidence
  if (momentum.length === 0) {
    issues.noMomentumEvidence.push({
      name: company.name,
      fundingCount: funding.length,
      monthsOld
    });
  }

  // Check if complete (has funding with valuation + recent + momentum)
  if (fundingWithVal.length > 0 && monthsOld <= 20 && momentum.length > 0) {
    issues.complete.push(company.name);
  }
}

// Report findings
console.log('ISSUE BREAKDOWN:\n');

console.log(`1. No Funding Evidence (${issues.noFundingEvidence.length} companies):`);
if (issues.noFundingEvidence.length > 0) {
  issues.noFundingEvidence.forEach(c => {
    console.log(`   - ${c.name} (${c.totalEvidence} total evidence items)`);
  });
} else {
  console.log('   ✓ All companies have funding evidence');
}
console.log();

console.log(`2. Funding Without Valuation (${issues.fundingWithoutValuation.length} companies):`);
console.log('   (Has funding rounds but no post-money valuation disclosed)\n');
if (issues.fundingWithoutValuation.length > 0) {
  issues.fundingWithoutValuation.slice(0, 5).forEach(c => {
    console.log(`   - ${c.name} (${c.fundingCount} funding items)`);
    console.log(`     Example: ${c.example}...`);
  });
  if (issues.fundingWithoutValuation.length > 5) {
    console.log(`   ... and ${issues.fundingWithoutValuation.length - 5} more`);
  }
} else {
  console.log('   ✓ All funding evidence includes valuations');
}
console.log();

console.log(`3. Stale Funding (${issues.staleFunding.length} companies, >20 months old):`);
if (issues.staleFunding.length > 0) {
  issues.staleFunding.slice(0, 5).forEach(c => {
    const momentumFlag = c.hasMomentum ? '✓ has momentum' : '✗ no momentum';
    console.log(`   - ${c.name}: ${c.monthsOld} months old (${c.mostRecentDate}) ${momentumFlag}`);
  });
  if (issues.staleFunding.length > 5) {
    console.log(`   ... and ${issues.staleFunding.length - 5} more`);
  }
} else {
  console.log('   ✓ All companies have recent funding evidence');
}
console.log();

console.log(`4. No Momentum Evidence (${issues.noMomentumEvidence.length} companies):`);
console.log('   (Revenue, Headcount, Product, Contracts, Metrics)\n');
if (issues.noMomentumEvidence.length > 0) {
  const recent = issues.noMomentumEvidence.filter(c => c.monthsOld <= 20);
  const stale = issues.noMomentumEvidence.filter(c => c.monthsOld > 20);
  console.log(`   Recent funding but no momentum: ${recent.length}`);
  console.log(`   Stale funding and no momentum: ${stale.length} (HIGHEST RISK)`);
  if (stale.length > 0) {
    console.log('\n   Highest risk companies (stale + no momentum):');
    stale.slice(0, 5).forEach(c => {
      console.log(`     - ${c.name} (${c.monthsOld} months old)`);
    });
  }
} else {
  console.log('   ✓ All companies have momentum evidence');
}
console.log();

console.log(`5. Complete Evidence (${issues.complete.length} companies):`);
console.log('   (Has funding with valuation + recent (<20mo) + momentum)\n');
if (issues.complete.length > 0) {
  console.log(`   ✓ ${issues.complete.length} companies have complete evidence:`);
  issues.complete.forEach(name => console.log(`     - ${name}`));
}
console.log();

// Summary
console.log('========================================');
console.log('SUMMARY & RECOMMENDATIONS');
console.log('========================================\n');

const total = companies?.length || 0;
console.log(`Most common gap: ${
  issues.fundingWithoutValuation.length > issues.staleFunding.length
    ? `Missing post-money valuations (${issues.fundingWithoutValuation.length}/${total} = ${Math.round(issues.fundingWithoutValuation.length/total*100)}%)`
    : `Stale funding evidence (${issues.staleFunding.length}/${total} = ${Math.round(issues.staleFunding.length/total*100)}%)`
}\n`);

console.log('Priority fixes:');
if (issues.fundingWithoutValuation.length > issues.staleFunding.length) {
  console.log('  1. Parse SEC Form D filings to extract/corroborate valuations');
  console.log('  2. Improve Perplexity prompts to capture post-money figures');
} else {
  console.log('  1. Trigger re-research for stale companies (>20 months)');
  console.log('  2. Add momentum evidence sourcing (public sources only)');
}

console.log('\n========================================');
