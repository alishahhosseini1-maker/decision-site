#!/usr/bin/env node

/**
 * Direct test of primary+secondary weighting formula on Anthropic
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Import the actual valuation generation logic
import { generateValuation } from '../app/lib/valuation.ts';

async function test() {
  console.log('FORMULA VERIFICATION TEST');
  console.log('='.repeat(80));
  console.log();

  const { data: company } = await supabase
    .from('lumen_companies')
    .select('*')
    .eq('id', '9bc85cca-71fe-48db-ac09-8b32b03275d3')
    .single();

  console.log('BEFORE:');
  const { data: before } = await supabase
    .from('lumen_valuations')
    .select('*')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (before) {
    console.log(`  Base case: $${before.base_case}B`);
    console.log(`  Generated: ${before.generated_at}`);
  }
  console.log();

  console.log('Company data:');
  console.log(`  Primary: $${company.last_round_value}B (${company.last_round_date})`);
  console.log();

  console.log('Triggering regeneration...');
  const result = await generateValuation(supabase, company);

  if (!result) {
    console.log('ERROR: generateValuation returned null');
    return;
  }

  console.log();
  console.log('='.repeat(80));
  console.log('AFTER:');
  console.log(`  Base case: $${result.base_case}B`);
  console.log(`  Bear case: $${result.bear_case}B`);
  console.log(`  Bull case: $${result.bull_case}B`);
  console.log(`  Confidence: ${result.confidence_score}`);
  console.log();

  console.log('='.repeat(80));
  console.log('VERIFICATION:');
  console.log('  Expected: $971B (from formula calculation)');
  console.log(`  Actual:   $${result.base_case}B`);

  const diff = Math.abs(result.base_case - 971);
  if (diff <= 5) {
    console.log('  ✓ MATCH - Formula is working!');
  } else {
    console.log(`  ✗ MISMATCH (diff: $${diff}B)`);
  }
}

test().catch(console.error);
