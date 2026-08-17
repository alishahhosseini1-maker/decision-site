#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Get Stripe
const { data: company } = await supabase
  .from('lumen_companies')
  .select('*')
  .ilike('name', '%Stripe%')
  .single();

console.log('Stripe Company Metadata:');
console.log(`  Last round: ${company.last_round_value ? `$${company.last_round_value}B` : 'NULL'} (${company.last_round_date || 'no date'})`);
console.log(`  Secondary: ${company.secondary_value ? `$${company.secondary_value}B` : 'NULL'} (${company.secondary_date || 'no date'})`);
console.log(`  Last researched: ${company.last_researched_at}`);
console.log();

// Get all evidence
const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', company.id)
  .order('date', { ascending: false });

console.log(`Total evidence: ${evidence?.length || 0} items`);

// Group by category
const byCategory = {};
evidence?.forEach(e => {
  if (!byCategory[e.category]) byCategory[e.category] = [];
  byCategory[e.category].push(e);
});

console.log('\nEvidence by category:');
Object.entries(byCategory).forEach(([cat, items]) => {
  console.log(`  ${cat}: ${items.length} items`);
});

console.log('\nFunding evidence:');
const funding = byCategory['Funding'] || [];
funding.slice(0, 10).forEach((e, i) => {
  const val = e.value ? `$${e.value}B` : 'NULL';
  console.log(`  ${i+1}. [${e.date || 'NO DATE'}] ${val} - ${e.round_type || 'unknown'}`);
  console.log(`     ${e.description.substring(0, 100)}`);
});

// Get latest valuation
const { data: valuation } = await supabase
  .from('lumen_valuations')
  .select('*')
  .eq('company_id', company.id)
  .order('generated_at', { ascending: false })
  .limit(1)
  .single();

console.log('\n' + '='.repeat(80));
console.log('LATEST VALUATION');
console.log('='.repeat(80));
console.log(`Base case: $${valuation.base_case}B`);
console.log(`Confidence: ${valuation.confidence_score}/100`);
console.log(`Generated: ${valuation.generated_at}`);
console.log();
console.log('Key drivers:');
if (Array.isArray(valuation.key_drivers)) {
  valuation.key_drivers.forEach(d => {
    console.log(`  ${d.impact === '+' ? '📈' : '📉'} ${d.label}`);
    console.log(`     ${d.note}`);
  });
} else {
  console.log(valuation.key_drivers);
}
console.log();
console.log('Explanation:');
console.log(valuation.explanation);
