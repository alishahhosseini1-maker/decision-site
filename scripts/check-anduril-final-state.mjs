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
  .select('name, last_round_value, last_round_date, last_valuation_at')
  .eq('slug', 'anduril-industries')
  .single();

console.log('Anduril Industries - Current State:');
console.log(`  Last round: $${company.last_round_value}B (${company.last_round_date})`);
console.log(`  Last valuation at: ${company.last_valuation_at}`);
console.log();

// Get latest valuation
const { data: valuation } = await supabase
  .from('lumen_valuations')
  .select('base_case, confidence_score, generated_at')
  .eq('company_id', 'f848c33d-217f-44fc-b1fb-2e85f1faceeb')
  .order('generated_at', { ascending: false })
  .limit(1)
  .single();

console.log('Latest Valuation:');
console.log(`  Base case: $${valuation.base_case}B`);
console.log(`  Confidence: ${valuation.confidence_score}/100`);
console.log(`  Generated: ${valuation.generated_at}`);
console.log();

// Count funding evidence
const { count } = await supabase
  .from('lumen_evidence')
  .select('*', { count: 'exact', head: true })
  .eq('company_id', 'f848c33d-217f-44fc-b1fb-2e85f1faceeb')
  .eq('category', 'Funding');

console.log(`Total funding evidence: ${count} items`);

// Get Series H specifically
const { data: seriesH } = await supabase
  .from('lumen_evidence')
  .select('date, value, description')
  .eq('company_id', 'f848c33d-217f-44fc-b1fb-2e85f1faceeb')
  .ilike('description', '%Series H%')
  .single();

if (seriesH) {
  console.log('✓ Series H confirmed in database:');
  console.log(`  Date: ${seriesH.date}`);
  console.log(`  Value: $${seriesH.value}B`);
}
