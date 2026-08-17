#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const LOCAL_URL = 'http://localhost:3003';

async function testCompany(name, expectedOld, expectedNew) {
  console.log('\n' + '='.repeat(80));
  console.log(`TESTING: ${name}`);
  console.log('='.repeat(80));
  
  // Get company
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .ilike('name', `%${name}%`)
    .single();

  if (!company) {
    console.log(`❌ Company not found: ${name}`);
    return;
  }

  // Get current valuation (before)
  const { data: before } = await supabase
    .from('lumen_valuations')
    .select('confidence_score, base_case')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`\nBefore (current database state):`);
  console.log(`  Confidence: ${before?.confidence_score || 'none'}/100`);
  console.log(`  Base case: $${before?.base_case || 'none'}B`);

  // Trigger regeneration via LOCAL dev server
  console.log(`\n⏳ Triggering valuation regeneration (local dev server)...`);
  
  const response = await fetch(`${LOCAL_URL}/api/lumen/companies/${company.id}/valuation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    console.log(`❌ API error: ${response.status}`);
    const error = await response.text();
    console.log(error);
    return;
  }

  const result = await response.json();
  
  console.log(`\n✓ Regeneration complete`);
  console.log(`\nAfter regeneration (new code with formulaic scoring):`);
  console.log(`  Confidence: ${result.valuation.confidence_score}/100 (predicted: ${expectedNew})`);
  console.log(`  Base case: $${result.valuation.base_case}B`);
  
  // Check match
  const match = result.valuation.confidence_score === expectedNew;
  const delta = Math.abs(result.valuation.confidence_score - expectedNew);
  
  console.log(`\n${'='.repeat(80)}`);
  if (match) {
    console.log(`✅ EXACT MATCH: ${name}`);
    console.log(`   Predicted: ${expectedNew} = Actual: ${result.valuation.confidence_score}`);
  } else if (delta <= 2) {
    console.log(`✅ CLOSE MATCH: ${name} (within ±2 points)`);
    console.log(`   Predicted: ${expectedNew}, Actual: ${result.valuation.confidence_score} (Δ ${delta})`);
  } else {
    console.log(`❌ MISMATCH: ${name}`);
    console.log(`   Predicted: ${expectedNew}`);
    console.log(`   Actual: ${result.valuation.confidence_score}`);
    console.log(`   Delta: ${delta} points`);
  }
  
  return {
    name,
    predicted: expectedNew,
    actual: result.valuation.confidence_score,
    match: match || delta <= 2,
    delta
  };
}

console.log('LIVE END-TO-END FORMULAIC CONFIDENCE TEST (LOCAL DEV)');
console.log('Testing biggest before/after deltas with new code');

const stripe = await testCompany('Stripe', 42, 12);
const anthropic = await testCompany('Anthropic', 62, 91);

console.log('\n' + '='.repeat(80));
console.log('FINAL SUMMARY');
console.log('='.repeat(80));
console.log();

const results = [stripe, anthropic].filter(r => r);

if (results.every(r => r.match)) {
  console.log('✅ ALL TESTS PASSED');
  console.log('   Formulaic confidence scoring working end-to-end');
  console.log('   Predictions match actual output (within ±2 points)');
  console.log();
  results.forEach(r => {
    const deltaStr = r.delta === 0 ? 'exact' : `Δ ${r.delta}`;
    console.log(`   ${r.name}: ${r.predicted} (predicted) vs ${r.actual} (actual) - ${deltaStr} ✓`);
  });
} else {
  console.log('❌ SOME TESTS FAILED');
  results.forEach(r => {
    const status = r.match ? '✓' : '✗';
    console.log(`   ${status} ${r.name}: ${r.predicted} (predicted) vs ${r.actual} (actual) - Δ ${r.delta}`);
  });
}

console.log();
