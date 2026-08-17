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

// Get all companies with their latest valuations
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name, slug');

const companiesWithValuations = [];

for (const company of companies || []) {
  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('base_case, confidence_score')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (valuation) {
    companiesWithValuations.push({
      ...company,
      base_case: valuation.base_case,
      confidence: valuation.confidence_score,
    });
  }
}

// Sort by confidence score
companiesWithValuations.sort((a, b) => a.confidence - b.confidence);

console.log('Companies by confidence score:\n');
console.log('Very Low (<40):');
companiesWithValuations.filter(c => c.confidence < 40).forEach(c => {
  console.log(`  ${c.name}: ${c.confidence}/100 ($${c.base_case}B)`);
});

console.log('\nLow (40-60):');
companiesWithValuations.filter(c => c.confidence >= 40 && c.confidence < 60).forEach(c => {
  console.log(`  ${c.name}: ${c.confidence}/100 ($${c.base_case}B)`);
});

console.log('\nMedium (60-80):');
companiesWithValuations.filter(c => c.confidence >= 60 && c.confidence < 80).forEach(c => {
  console.log(`  ${c.name}: ${c.confidence}/100 ($${c.base_case}B)`);
});

console.log('\nHigh (80+):');
companiesWithValuations.filter(c => c.confidence >= 80).forEach(c => {
  console.log(`  ${c.name}: ${c.confidence}/100 ($${c.base_case}B)`);
});
