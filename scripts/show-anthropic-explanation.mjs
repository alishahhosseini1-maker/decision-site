#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: company } = await supabase
  .from('lumen_companies')
  .select('id')
  .ilike('name', 'Anthropic')
  .single();

const { data: valuation } = await supabase
  .from('lumen_valuations')
  .select('base_case, explanation')
  .eq('company_id', company.id)
  .order('generated_at', { ascending: false })
  .limit(1)
  .single();

console.log('ANTHROPIC');
console.log('-'.repeat(80));
console.log(`Base case: $${valuation.base_case}B`);
console.log();
console.log('Explanation:');
console.log(valuation.explanation);
