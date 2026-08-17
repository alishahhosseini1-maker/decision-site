#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', '9bc85cca-71fe-48db-ac09-8b32b03275d3')
  .eq('category', 'Revenue')
  .order('date', { ascending: false });

console.log(`Found ${evidence?.length || 0} Revenue evidence items:\n`);

evidence?.forEach((e, i) => {
  console.log(`${i + 1}. ${e.status} — ${e.date}`);
  console.log(`   Value: ${e.value}`);
  console.log(`   Description: ${e.description.substring(0, 120)}...`);
  console.log(`   Source: ${e.source_type}`);
  console.log();
});

console.log('='.repeat(80));
console.log('DIAGNOSIS:');
console.log('='.repeat(80));
console.log('\nThe most credible/recent revenue is PROJECTED 2028 ($190B-$200B).');
console.log('\nThis creates unrealistic comparables because:');
console.log('1. Public comps use CURRENT revenue multiples (EV / TTM revenue)');
console.log('2. Anthropic uses FUTURE projected revenue (2028 projection)');
console.log('3. Mismatch: comparing future revenue to current multiples inflates range');
console.log('\nUser saw: "$604.5B–$11,758.5B" implied range');
console.log('With $190B revenue × 3.2x-62x multiples → huge spread');
console.log('\nSOLUTION OPTIONS:');
console.log('A. Find/add CURRENT revenue evidence for Anthropic (2024/2025 actual)');
console.log('B. Disable comps panel when only projected revenue exists');
console.log('C. Add disclaimer: "Based on projected 2028 revenue" + warn about mismatch');
console.log('D. Filter revenue evidence to prefer "actual" over "projected"');
