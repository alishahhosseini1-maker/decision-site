#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const companies = [
  { name: 'SpaceX', id: null },
  { name: 'Anthropic', id: null }
];

for (const comp of companies) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id')
    .ilike('name', comp.name)
    .single();
  
  comp.id = company?.id;
}

console.log('WEIGHTING LOGIC COMPARISON');
console.log('='.repeat(80));
console.log();

for (const comp of companies) {
  if (!comp.id) continue;

  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('base_case, explanation')
    .eq('company_id', comp.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`${comp.name.toUpperCase()}`);
  console.log('-'.repeat(80));
  console.log(`Base case: $${valuation?.base_case}B`);
  console.log();
  console.log('Explanation:');
  console.log(valuation?.explanation || 'none');
  console.log();
  console.log('='.repeat(80));
  console.log();
}
