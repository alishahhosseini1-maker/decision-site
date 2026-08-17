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

// Get Anduril company metadata
const { data: company } = await supabase
  .from('lumen_companies')
  .select('id, name, current_valuation, last_round_value, last_round_date, secondary_value, secondary_date')
  .ilike('name', '%Anduril%')
  .single();

console.log('Current Anduril metadata:');
console.log(`  ID: ${company.id}`);
console.log(`  Current valuation: $${company.current_valuation}B`);
console.log(`  Last round: $${company.last_round_value}B (${company.last_round_date})`);
console.log(`  Secondary: $${company.secondary_value}B (${company.secondary_date})`);
console.log();

// Get recent funding evidence
const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('date, description, value, credibility')
  .eq('company_id', company.id)
  .eq('category', 'Funding')
  .order('date', { ascending: false });

console.log('Recent funding evidence:');
evidence.slice(0, 8).forEach((e, i) => {
  const val = e.value ? `$${e.value}B` : 'NULL';
  console.log(`  ${i+1}. [${e.date}] ${val} (${e.credibility})`);
  console.log(`     ${e.description.substring(0, 100)}`);
});

// Check if Series H exists
const seriesH = evidence.find(e => e.description.match(/Series H/i));
console.log();
if (seriesH) {
  console.log('✓ Series H found in database');
} else {
  console.log('✗ Series H NOT found - needs to be added');
}
