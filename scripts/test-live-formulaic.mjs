#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SITE_URL = 'https://decisionlayer.dev';

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
    .select('confidence_score, base_case, generated_at')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`\nBefore regeneration:`);
  console.log(`  Confidence: ${before.confidence_score}/100 (expected: ${expectedOld})`);
  console.log(`  Base case: $${before.base_case}B`);
  console.log(`  Generated: ${before.generated_at}`);

  // Trigger regeneration via production API
  console.log(`\n⏳ Triggering valuation regeneration...`);
  
  const response = await fetch(`${SITE_URL}/api/lumen/companies/${company.id}/valuation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });

  if (!response.ok) {
    console.log(`❌ API error: ${response.status}`);
    const error = await response.json();
    console.log(error);
    return;
  }

  const result = await response.json();
  
  console.log(`\n✓ Regeneration complete`);
  console.log(`\nAfter regeneration (API response):`);
  console.log(`  Confidence: ${result.valuation.confidence_score}/100 (expected: ${expectedNew})`);
  console.log(`  Base case: $${result.valuation.base_case}B`);
  
  // Verify in database
  const { data: after } = await supabase
    .from('lumen_valuations')
    .select('confidence_score, base_case, generated_at')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`\nDatabase verification:`);
  console.log(`  Confidence: ${after.confidence_score}/100`);
  console.log(`  Base case: $${after.base_case}B`);
  console.log(`  Generated: ${after.generated_at}`);
  
  // Check match
  const confidenceMatch = after.confidence_score === expectedNew;
  const apiMatch = result.valuation.confidence_score === after.confidence_score;
  
  console.log(`\n${'='.repeat(80)}`);
  if (confidenceMatch && apiMatch) {
    console.log(`✅ SUCCESS: ${name}`);
    console.log(`   Predicted: ${expectedNew} → Actual: ${after.confidence_score}`);
    console.log(`   API and database match ✓`);
  } else {
    console.log(`❌ MISMATCH: ${name}`);
    console.log(`   Predicted: ${expectedNew}`);
    console.log(`   API returned: ${result.valuation.confidence_score}`);
    console.log(`   Database shows: ${after.confidence_score}`);
    console.log(`   Confidence match: ${confidenceMatch ? 'YES' : 'NO'}`);
    console.log(`   API/DB match: ${apiMatch ? 'YES' : 'NO'}`);
  }
  
  return {
    name,
    predicted: expectedNew,
    actual: after.confidence_score,
    match: confidenceMatch && apiMatch
  };
}

console.log('LIVE END-TO-END FORMULAIC CONFIDENCE TEST');
console.log('Testing biggest before/after deltas');

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
  console.log('   Predictions match actual production output');
  console.log();
  results.forEach(r => {
    console.log(`   ${r.name}: ${r.predicted} (predicted) = ${r.actual} (actual) ✓`);
  });
} else {
  console.log('❌ SOME TESTS FAILED');
  results.forEach(r => {
    const status = r.match ? '✓' : '✗';
    console.log(`   ${status} ${r.name}: ${r.predicted} (predicted) vs ${r.actual} (actual)`);
  });
}

console.log();
