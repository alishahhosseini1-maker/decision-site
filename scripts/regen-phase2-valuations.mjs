#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { generateValuation } from '../app/lib/valuation.ts';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
    process.env[match[1]] = match[2]; // Set in process.env for generateValuation
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const companies = ['Glean', 'Harvey', 'PsiQuantum'];

console.log('=== REGENERATING PHASE 2 VALUATIONS WITH STRUCTURAL FIXES ===\n');

for (const name of companies) {
  console.log(`Regenerating ${name}...`);

  const { data: company } = await supabase
    .from('lumen_companies')
    .select('*')
    .ilike('name', name)
    .single();

  // Call generateValuation directly
  try {
    const valuation = await generateValuation(supabase, company);

    if (!valuation) {
      console.error(`  ❌ Failed to generate valuation (returned null)`);
      continue;
    }

    console.log(`  Base Case: ${valuation.base_case !== null ? '$' + valuation.base_case.toFixed(1) + 'B' : 'NULL (insufficient evidence)'}`);
    console.log(`  Confidence: ${valuation.confidence_score}%`);
    console.log(`  Explanation: ${valuation.explanation ? valuation.explanation.substring(0, 120) + '...' : 'N/A'}`);
    console.log(`  Status: ${valuation.base_case !== null ? '✅ REAL VALUATION' : '⚠️ INSUFFICIENT EVIDENCE'}`);
    console.log('');
  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  }
}

console.log('=== REGENERATION COMPLETE ===');
