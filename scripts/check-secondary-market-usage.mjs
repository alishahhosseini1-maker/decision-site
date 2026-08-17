#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check for existing "Secondary market" evidence
const { data: evidence, count } = await supabase
  .from('lumen_evidence')
  .select('*', { count: 'exact' })
  .eq('category', 'Secondary market');

console.log(`Found ${count} "Secondary market" evidence items\n`);

if (evidence && evidence.length > 0) {
  console.log('Sample items:');
  evidence.slice(0, 5).forEach((e, i) => {
    console.log(`${i + 1}. ${e.description.substring(0, 80)}`);
    console.log(`   Date: ${e.date || 'NULL'}, Value: ${e.value || 'NULL'}`);
  });
}

// Check for undated items
const undated = evidence?.filter(e => !e.date) || [];
console.log(`\nUndated items: ${undated.length}`);
if (undated.length > 0) {
  console.log('Companies with undated secondary market evidence:');
  for (const item of undated) {
    const { data: company } = await supabase
      .from('lumen_companies')
      .select('name')
      .eq('id', item.company_id)
      .single();
    console.log(`  - ${company?.name}: ${item.description.substring(0, 60)}`);
  }
}
