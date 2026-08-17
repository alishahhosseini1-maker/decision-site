#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Get Anthropic
const { data: company } = await supabase
  .from('lumen_companies')
  .select('id')
  .ilike('name', '%Anthropic%')
  .single();

// Get all Secondary evidence
const { data: secondary } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', company.id)
  .eq('category', 'Secondary')
  .order('date', { ascending: false });

console.log('ANTHROPIC SECONDARY EVIDENCE');
console.log('='.repeat(80));
console.log();

secondary?.forEach((item, i) => {
  console.log(`${i + 1}. [${item.date}]`);
  console.log(`   Description: ${item.description}`);
  console.log(`   Value: ${item.value}`);
  console.log(`   Source: ${item.source_type} - ${item.source_label}`);
  console.log(`   Citation: ${item.citation_url || 'none'}`);
  console.log(`   Status: ${item.status}`);
  console.log();
});

// Get latest valuation
const { data: valuation } = await supabase
  .from('lumen_valuations')
  .select('base_case, key_drivers, explanation')
  .eq('company_id', company.id)
  .order('generated_at', { ascending: false })
  .limit(1)
  .single();

console.log('='.repeat(80));
console.log('LATEST VALUATION');
console.log('='.repeat(80));
console.log(`Base case: $${valuation.base_case}B`);
console.log();
console.log('Key drivers:');
if (Array.isArray(valuation.key_drivers)) {
  valuation.key_drivers.forEach(d => {
    console.log(`  ${d.impact} ${d.label}`);
    console.log(`     ${d.note}`);
  });
} else {
  console.log(valuation.key_drivers);
}
console.log();
console.log('Explanation:');
console.log(valuation.explanation);
