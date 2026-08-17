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

// Set environment variables
Object.keys(env).forEach(key => {
  process.env[key] = env[key];
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const ANDURIL_ID = 'f848c33d-217f-44fc-b1fb-2e85f1faceeb';

console.log('Fetching Anduril company data...\n');

const { data: company } = await supabase
  .from('lumen_companies')
  .select('*')
  .eq('id', ANDURIL_ID)
  .single();

console.log(`Company: ${company.name}`);
console.log(`Last round: $${company.last_round_value}B (${company.last_round_date})`);
console.log();

// Import and call generateValuation
const { generateValuation } = await import('../app/lib/valuation.ts');

console.log('Generating valuation...\n');

const valuation = await generateValuation(supabase, company);

if (!valuation) {
  console.log('❌ Failed to generate valuation');
} else {
  console.log('✓ Valuation generated:');
  console.log(`  Base case: $${valuation.base_case}B`);
  console.log(`  Bear case: $${valuation.bear_case}B`);
  console.log(`  Bull case: $${valuation.bull_case}B`);
  console.log(`  Confidence: ${valuation.confidence_score}/100`);
  console.log();
  console.log('Key drivers:');
  console.log(valuation.key_drivers);
  
  // Update last_valuation_at timestamp
  await supabase
    .from('lumen_companies')
    .update({ last_valuation_at: new Date().toISOString() })
    .eq('id', ANDURIL_ID);
}
