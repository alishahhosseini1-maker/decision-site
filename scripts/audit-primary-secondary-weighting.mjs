#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('AUDIT: Primary + Secondary Evidence Weighting Consistency');
console.log('='.repeat(80));
console.log();

// Get all companies
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name');

const results = [];

for (const company of companies || []) {
  // Get funding evidence (primary)
  const { data: funding } = await supabase
    .from('lumen_evidence')
    .select('date, value, description')
    .eq('company_id', company.id)
    .eq('category', 'Funding')
    .order('date', { ascending: false });

  // Get secondary evidence
  const { data: secondary } = await supabase
    .from('lumen_evidence')
    .select('date, value, description, source_type')
    .eq('company_id', company.id)
    .eq('category', 'Secondary')
    .order('date', { ascending: false });

  // Get latest valuation
  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('base_case, bear_case, bull_case, explanation')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (!valuation) continue;

  const hasPrimary = funding && funding.length > 0 && funding[0].value;
  const hasSecondary = secondary && secondary.length > 0;

  if (hasPrimary && hasSecondary) {
    const mostRecentPrimary = funding[0];
    const mostRecentSecondary = secondary[0];
    
    // Parse values (handle different formats)
    const parseValue = (val) => {
      if (!val) return null;
      if (typeof val === 'number') return val;
      const str = val.toString().toUpperCase();
      if (str.includes('T')) return parseFloat(str) * 1000;
      if (str.includes('B')) return parseFloat(str);
      return parseFloat(str);
    };

    const primaryValue = parseValue(mostRecentPrimary.value);
    const secondaryValue = parseValue(mostRecentSecondary.value);
    const baseCase = valuation.base_case;

    // Calculate where base case falls relative to primary/secondary
    let position = 'unknown';
    if (primaryValue && secondaryValue) {
      if (baseCase === primaryValue) {
        position = 'equals_primary';
      } else if (baseCase === secondaryValue) {
        position = 'equals_secondary';
      } else if (baseCase > Math.min(primaryValue, secondaryValue) && 
                 baseCase < Math.max(primaryValue, secondaryValue)) {
        position = 'between_primary_and_secondary';
      } else if (baseCase > Math.max(primaryValue, secondaryValue)) {
        position = 'above_both';
      } else {
        position = 'below_both';
      }
    }

    results.push({
      name: company.name,
      primaryValue,
      primaryDate: mostRecentPrimary.date,
      secondaryValue,
      secondaryDate: mostRecentSecondary.date,
      baseCase,
      position,
      explanation: valuation.explanation?.substring(0, 200) + '...',
    });
  }
}

console.log(`Companies with BOTH primary and secondary evidence: ${results.length}\n`);

if (results.length === 0) {
  console.log('No companies found with both primary and secondary evidence.');
  console.log('(Anthropic may be the only case currently)');
} else {
  console.log('Position analysis:');
  const byPosition = {};
  results.forEach(r => {
    if (!byPosition[r.position]) byPosition[r.position] = [];
    byPosition[r.position].push(r);
  });

  Object.entries(byPosition).forEach(([pos, items]) => {
    console.log(`\n${pos}: ${items.length} companies`);
    items.forEach(r => {
      console.log(`  ${r.name}:`);
      console.log(`    Primary: $${r.primaryValue}B (${r.primaryDate})`);
      console.log(`    Secondary: $${r.secondaryValue}B (${r.secondaryDate})`);
      console.log(`    Base case: $${r.baseCase}B`);
      
      // Calculate weight implied by base case position
      if (r.position === 'between_primary_and_secondary') {
        const range = Math.abs(r.secondaryValue - r.primaryValue);
        const offset = r.baseCase - Math.min(r.primaryValue, r.secondaryValue);
        const weight = (offset / range * 100).toFixed(1);
        console.log(`    Implied secondary weight: ${weight}%`);
      }
    });
  });

  console.log('\n' + '='.repeat(80));
  console.log('INCONSISTENCY CHECK');
  console.log('='.repeat(80));
  
  const multiPosition = Object.keys(byPosition).length > 1;
  if (multiPosition) {
    console.log('❌ INCONSISTENT: Different companies use different weighting logic');
    console.log(`   Found ${Object.keys(byPosition).length} different position patterns`);
  } else {
    console.log('✓ CONSISTENT: All companies use same weighting approach');
  }
}
