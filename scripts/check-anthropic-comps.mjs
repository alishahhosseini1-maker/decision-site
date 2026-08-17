#!/usr/bin/env node
/**
 * Check Anthropic's comparables calculation to verify if working correctly.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';

async function checkComps() {
  console.log('ANTHROPIC COMPARABLES PANEL CHECK');
  console.log('='.repeat(80));

  // Get company data
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('*')
    .eq('id', ANTHROPIC_ID)
    .single();

  console.log(`\nCompany: ${company.name}`);
  console.log(`Sector: ${company.sector}`);
  console.log(`Last round valuation: $${company.last_round_value}B`);

  // Get revenue evidence
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', ANTHROPIC_ID);

  const revenueEvidence = evidence?.filter(e => e.category === 'Revenue' && e.status === 'verified')
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  if (!revenueEvidence) {
    console.log('\n❌ No revenue evidence found');
    return;
  }

  console.log(`\nRevenue evidence:`);
  console.log(`  Date: ${revenueEvidence.date}`);
  console.log(`  Value: ${revenueEvidence.value}`);
  console.log(`  Description: ${revenueEvidence.description.substring(0, 100)}...`);

  // Extract revenue in billions
  const extractRevenue = (desc, val) => {
    // Try value field first
    if (val) {
      const str = val.toString().toUpperCase();
      if (str.includes('B')) {
        const match = str.match(/([\d.]+)\s*B/);
        if (match) return parseFloat(match[1]);
      }
    }
    // Try description
    const match = desc.match(/\$?([\d.]+)\s*([BTM])/i);
    if (match) {
      const amount = parseFloat(match[1]);
      const unit = match[2].toUpperCase();
      if (unit === 'B') return amount;
      if (unit === 'M') return amount / 1000;
      if (unit === 'T') return amount * 1000;
    }
    return null;
  };

  const revenue = extractRevenue(revenueEvidence.description, revenueEvidence.value);
  console.log(`  Extracted revenue: $${revenue}B`);

  // Get AI valuation
  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('base_case')
    .eq('company_id', ANTHROPIC_ID)
    .maybeSingle();

  console.log(`\nAI valuation: $${valuation?.base_case}B`);

  // Calculate multiples
  const lastRoundMultiple = company.last_round_value / revenue;
  const aiFairValueMultiple = valuation?.base_case / revenue;

  console.log(`\nAnthropics own multiples:`);
  console.log(`  Last round: ${lastRoundMultiple.toFixed(1)}x (${company.last_round_value}B / ${revenue}B)`);
  console.log(`  AI fair value: ${aiFairValueMultiple.toFixed(1)}x (${valuation?.base_case}B / ${revenue}B)`);

  // Simulate what comps would show
  console.log(`\n${'='.repeat(80)}`);
  console.log('EXPECTED COMPS PANEL DISPLAY:');
  console.log('='.repeat(80));
  console.log(`\nRevenue: $${revenue}B — ${revenueEvidence.source_label}, ${revenueEvidence.date}`);
  console.log(`Anthropic's own multiple: ${lastRoundMultiple.toFixed(1)}x last round · ${aiFairValueMultiple.toFixed(1)}x AI fair value`);
  console.log(`\nIf Perplexity returns these example comps:`);
  console.log(`  Palantir: 15x multiple → implied valuation: $${(revenue * 15).toFixed(1)}B`);
  console.log(`  CoreWeave: 25x multiple → implied valuation: $${(revenue * 25).toFixed(1)}B`);
  console.log(`  C3.ai: 60x multiple → implied valuation: $${(revenue * 60).toFixed(1)}B`);
  console.log(`\nImplied range would be: $${(revenue * 15).toFixed(1)}B – $${(revenue * 60).toFixed(1)}B`);
  console.log(`\nUser saw: "$604.5B–$11,758.5B"`);
  console.log(`This suggests VERY high revenue multiples from comps (or incorrect revenue extraction).`);
  console.log(`\nTo diagnose: actual revenue should be in $10B-200B range for Anthropic.`);
  console.log(`If revenue extracted as $10B and range is $604B-$11,758B, implies 60x-1,175x multiples (unrealistic).`);
}

checkComps().catch(console.error);
