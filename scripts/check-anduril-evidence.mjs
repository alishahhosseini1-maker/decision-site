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

// Get Anduril company
const { data: company } = await supabase
  .from('lumen_companies')
  .select('*')
  .eq('slug', 'anduril-industries')
  .single();

console.log('Anduril Industries:');
console.log(`  ID: ${company.id}`);
console.log(`  Last researched: ${company.last_researched_at}`);
console.log(`  Last valuation: ${company.last_valuation_at}`);
console.log();

// Get funding evidence
const { data: funding } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', company.id)
  .eq('category', 'Funding')
  .order('date', { ascending: false });

console.log(`Funding evidence (${funding?.length || 0} items):`);
funding?.forEach((e, i) => {
  const val = e.value ? `$${e.value}B` : 'NULL';
  console.log(`  ${i+1}. [${e.date || 'NO DATE'}] ${val} (${e.credibility})`);
  console.log(`     ${e.description.substring(0, 120)}`);
  console.log();
});

// Get latest valuation
const { data: valuation } = await supabase
  .from('lumen_valuations')
  .select('*')
  .eq('company_id', company.id)
  .order('generated_at', { ascending: false })
  .limit(1)
  .single();

if (valuation) {
  console.log('Latest valuation:');
  console.log(`  Base case: $${valuation.base_case}B`);
  console.log(`  Confidence: ${valuation.confidence_score}/100`);
  console.log(`  Generated: ${valuation.generated_at}`);
  console.log(`  Key drivers: ${valuation.key_drivers?.substring(0, 200)}`);
} else {
  console.log('No valuations found');
}
