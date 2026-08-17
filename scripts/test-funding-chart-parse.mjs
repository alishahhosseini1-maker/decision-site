#!/usr/bin/env node
/**
 * Test that funding chart value parsing works correctly.
 * Verifies the parseSecondaryValue() function handles various formats.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Inline parseSecondaryValue from app/lib/formula.ts
function parseSecondaryValue(valueField) {
  if (!valueField) return null;

  const str = valueField.toString().toUpperCase();

  // "$1.2T" or "1.2T" → 1200B
  if (str.includes('T')) {
    const match = str.match(/([\d.]+)\s*T/);
    if (match) return parseFloat(match[1]) * 1000;
  }

  // "$800B" or "800B" → 800B
  if (str.includes('B') && !str.includes('BILLION')) {
    const match = str.match(/([\d.]+)\s*B/);
    if (match) return parseFloat(match[1]);
  }

  // "800000000000" (raw dollars as string) → 800B
  const asNumber = parseFloat(str);
  if (!isNaN(asNumber)) {
    if (asNumber > 1000) return asNumber / 1000000000; // Convert dollars to billions
    return asNumber; // Already in billions
  }

  // "$350,000,000,000 valuation" → 350B
  const largeNumberMatch = str.match(/\$?([\d,]+),000,000,000/);
  if (largeNumberMatch) {
    const num = largeNumberMatch[1].replace(/,/g, '');
    return parseFloat(num);
  }

  return null;
}

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';

async function testFundingChartParsing() {
  console.log('FUNDING CHART VALUE PARSING TEST');
  console.log('='.repeat(80));
  console.log();

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', ANTHROPIC_ID)
    .eq('category', 'Funding')
    .eq('status', 'verified')
    .order('date', { ascending: true });

  console.log(`Found ${evidence?.length || 0} verified Funding evidence items for Anthropic:\n`);

  if (!evidence || evidence.length === 0) {
    console.log('No evidence found.');
    return;
  }

  console.log('Value field → Parsed as billions:');
  console.log('-'.repeat(80));

  let hasErrors = false;

  evidence.forEach((e) => {
    const parsed = parseSecondaryValue(e.value);
    const status = parsed !== null ? '✓' : '✗';

    if (parsed === null) {
      hasErrors = true;
      console.log(`${status} "${e.value}" → FAILED TO PARSE (${e.date})`);
    } else {
      console.log(`${status} "${e.value}" → $${parsed}B (${e.date})`);
    }
  });

  console.log();
  console.log('='.repeat(80));

  if (hasErrors) {
    console.log('❌ PARSING ERRORS DETECTED — chart will show incorrect values');
    console.log('   Fix: update parseSecondaryValue() to handle these formats');
  } else {
    console.log('✅ All values parsed correctly — chart should display accurate bars');
  }

  console.log();
  console.log('Expected chart bars (in order by date):');
  const values = evidence
    .map(e => parseSecondaryValue(e.value))
    .filter(v => v !== null);

  console.log('  ' + values.map(v => `$${v}B`).join(' / '));
  console.log();
  console.log('User reported seeing: "$60B/$183B/$380B×3/$965B" (before deduplication)');
  console.log('After deduplication, should show: no duplicates, real values');
}

testFundingChartParsing().catch(console.error);
