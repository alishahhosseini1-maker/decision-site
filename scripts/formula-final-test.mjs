#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const CONFIDENCE_MAP = { 'Reputable Publication': 85, 'Industry Research': 75 };
const PARAMS = { MIN_SECONDARY_WEIGHT: 0.10, MAX_SECONDARY_WEIGHT: 0.70, ILLIQUIDITY_DISCOUNT: 0.15, BASELINE_CREDIBILITY: 75, NAMED_SOURCE_BONUS: 1.15, VERIFIED_BONUS: 1.10 };

function parseSecondaryValue(valueField) {
  if (!valueField) return null;
  const str = valueField.toString().toUpperCase();
  if (str.includes('T')) { const match = str.match(/([\d.]+)\s*T/); if (match) return parseFloat(match[1]) * 1000; }
  if (str.includes('B') && !str.includes('BILLION')) { const match = str.match(/([\d.]+)\s*B/); if (match) return parseFloat(match[1]); }
  const asNumber = parseFloat(str);
  if (!isNaN(asNumber)) { if (asNumber > 1000) return asNumber / 1000000000; return asNumber; }
  const largeNumberMatch = str.match(/\$?([\d,]+),000,000,000/);
  if (largeNumberMatch) { const num = largeNumberMatch[1].replace(/,/g, ''); return parseFloat(num); }
  return null;
}

function monthsSince(dateStr, referenceDate = new Date()) {
  if (!dateStr) return 999;
  return Math.max(0, (referenceDate - new Date(dateStr)) / (1000 * 60 * 60 * 24 * 30));
}

function calculateFormula(primaryValue, primaryDate, secondaryEvidence, referenceDate) {
  const secondaryValue = parseSecondaryValue(secondaryEvidence.value);
  if (!secondaryValue) return null;

  const adjustedSecondaryValue = secondaryValue * (1 - PARAMS.ILLIQUIDITY_DISCOUNT);
  const monthsSincePrimary = monthsSince(primaryDate, referenceDate);
  const monthsSinceSecondary = monthsSince(secondaryEvidence.date, referenceDate);
  
  const denominator = monthsSincePrimary + monthsSinceSecondary + 1;
  const stalnessWeight = Math.min(PARAMS.MAX_SECONDARY_WEIGHT, Math.max(PARAMS.MIN_SECONDARY_WEIGHT, monthsSincePrimary / denominator));
  
  const sourceCredibility = CONFIDENCE_MAP[secondaryEvidence.source_type] || PARAMS.BASELINE_CREDIBILITY;
  const hasNamedSources = /CEO|CFO|founder|president|named|quoted/i.test(secondaryEvidence.description);
  const namedBonus = hasNamedSources ? PARAMS.NAMED_SOURCE_BONUS : 1.0;
  const verifiedBonus = secondaryEvidence.status === 'verified' ? PARAMS.VERIFIED_BONUS : 1.0;
  const credibilityMultiplier = Math.min(1.5, Math.max(0.5, (sourceCredibility / PARAMS.BASELINE_CREDIBILITY) * namedBonus * verifiedBonus));
  
  const finalWeight = Math.min(PARAMS.MAX_SECONDARY_WEIGHT, Math.max(PARAMS.MIN_SECONDARY_WEIGHT, stalnessWeight * credibilityMultiplier));
  const baseCase = Math.round((1 - finalWeight) * primaryValue + finalWeight * adjustedSecondaryValue);

  return { baseCase, finalWeight, monthsSincePrimary, monthsSinceSecondary, secondaryValue, adjustedSecondaryValue };
}

const companies = [
  { id: 'fc9a1766-bcce-4889-8df2-f6e7a35c7eec', name: 'SpaceX' },
  { id: '9bc85cca-71fe-48db-ac09-8b32b03275d3', name: 'Anthropic' }
];

console.log('FORMULA VS AI - FINAL COMPARISON');
console.log('='.repeat(80));
console.log();

for (const company of companies) {
  const { data: primary } = await supabase.from('lumen_evidence').select('date, value').eq('company_id', company.id).eq('category', 'Funding').not('value', 'is', null).order('date', { ascending: false }).limit(1).single();
  const { data: secondary } = await supabase.from('lumen_evidence').select('*').eq('company_id', company.id).eq('category', 'Secondary').order('date', { ascending: false }).limit(1).single();
  const { data: currentVal } = await supabase.from('lumen_valuations').select('base_case').eq('company_id', company.id).order('generated_at', { ascending: false }).limit(1).single();

  if (!primary || !secondary) continue;

  const result = calculateFormula(parseFloat(primary.value), primary.date, secondary, new Date('2026-08-17'));

  console.log(`${company.name.toUpperCase()}`);
  console.log('-'.repeat(80));
  console.log(`AI base case:      $${currentVal.base_case}B`);
  console.log(`Formula base case: $${result.baseCase}B`);
  console.log(`Difference:        ${result.baseCase - currentVal.base_case >= 0 ? '+' : ''}${result.baseCase - currentVal.base_case}B`);
  console.log();
  console.log(`Primary:      $${primary.value}B (${primary.date}, ${result.monthsSincePrimary.toFixed(1)}mo old)`);
  console.log(`Secondary:    $${result.secondaryValue}B → $${result.adjustedSecondaryValue.toFixed(1)}B after 15% discount`);
  console.log(`              (${secondary.date}, ${result.monthsSinceSecondary.toFixed(1)}mo old)`);
  console.log(`Final weight: ${(result.finalWeight * 100).toFixed(1)}% secondary`);
  console.log();
  console.log('='.repeat(80));
  console.log();
}

console.log('OBSERVATIONS:');
console.log('  - SpaceX: Stale primary (44mo) → high secondary weight (70%)');
console.log('  - Anthropic: Fresh primary (2.6mo) → lower secondary weight');
console.log('  - Both apply 15% illiquidity discount consistently');
console.log('  - Formula produces different results than AI (proves inconsistency)');
