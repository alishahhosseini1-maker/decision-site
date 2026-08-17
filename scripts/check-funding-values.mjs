#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';

const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', ANTHROPIC_ID)
  .eq('category', 'Funding')
  .eq('status', 'verified')
  .order('date', { ascending: true });

console.log('Anthropic Verified Funding Evidence:\n');

evidence?.forEach((e) => {
  console.log(`Date: ${e.date}`);
  console.log(`Value: ${e.value}`);
  console.log(`Description: ${e.description.substring(0, 120)}...`);
  console.log();
});

console.log('\nQUESTION: Should chart show AMOUNT RAISED or POST-MONEY VALUATION?');
console.log('\nLooking at the descriptions, these values appear to be POST-MONEY VALUATIONS.');
console.log('User expects to see AMOUNT RAISED ($3B, $2B, etc.) not valuations.');
console.log('\nNeed to extract raised amounts from descriptions instead of using .value field.');
