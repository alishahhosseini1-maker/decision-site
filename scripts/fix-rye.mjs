#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { generateValuation } from '../app/lib/valuation.ts';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2];
    process.env[match[1]] = match[2];
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('=== FIXING RYE VALUATION ===\n');

const { data: company } = await supabase
  .from('lumen_companies')
  .select('*')
  .eq('slug', 'rye')
  .single();

const valuation = await generateValuation(supabase, company);

if (!valuation) {
  console.error('❌ Failed to regenerate');
  process.exit(1);
}

console.log('✅ Regenerated successfully:');
console.log(`   Base Case: ${valuation.base_case !== null ? '$' + valuation.base_case.toFixed(1) + 'B' : 'NULL (insufficient evidence)'}`);
console.log(`   Confidence: ${valuation.confidence_score}%`);
console.log(`   Explanation: ${valuation.explanation ? valuation.explanation.substring(0, 100) + '...' : 'N/A'}`);
console.log(`   Status: ${valuation.base_case !== null ? '✅ REAL VALUATION' : '⚠️ INSUFFICIENT EVIDENCE'}`);
