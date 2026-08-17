#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const CONFIDENCE_MAP = {
  'SEC / Government Filing': 95,
  'Verified Filings': 95,
  'Company Announcement': 90,
  'Reputable Publication': 85,
  'Industry Research': 75,
  'Social Media': 60,
  'Unattributed': 40,
  'Anonymous Tip': 25,
};

const PARAMS = {
  MIN_SECONDARY_WEIGHT: 0.10,
  MAX_SECONDARY_WEIGHT: 0.70,
  ILLIQUIDITY_DISCOUNT: 0.15,
  BASELINE_CREDIBILITY: 75,
  NAMED_SOURCE_BONUS: 1.15,
  VERIFIED_BONUS: 1.10,
};

function parseSecondaryValue(valueField) {
  if (!valueField) return null;
  const str = valueField.toString().toUpperCase();

  if (str.includes('T')) {
    const match = str.match(/([\d.]+)\s*T/);
    if (match) return parseFloat(match[1]) * 1000;
  }

  if (str.includes('B') && !str.includes('BILLION')) {
    const match = str.match(/([\d.]+)\s*B/);
    if (match) return parseFloat(match[1]);
  }

  const asNumber = parseFloat(str);
  if (!isNaN(asNumber)) {
    if (asNumber > 1000) return asNumber / 1000000000;
    return asNumber;
  }

  const largeNumberMatch = str.match(/\$?([\d,]+),000,000,000/);
  if (largeNumberMatch) {
    const num = largeNumberMatch[1].replace(/,/g, '');
    return parseFloat(num);
  }

  return null;
}

function monthsSince(dateStr, referenceDate = new Date()) {
  if (!dateStr) return 999;
  const then = new Date(dateStr);
  const months = (referenceDate - then) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, months);
}

function calculateStalnessWeight(monthsSincePrimary, monthsSinceSecondary) {
  const denominator = monthsSincePrimary + monthsSinceSecondary + 1;
  const rawRatio = monthsSincePrimary / denominator;
  return Math.min(PARAMS.MAX_SECONDARY_WEIGHT, Math.max(PARAMS.MIN_SECONDARY_WEIGHT, rawRatio));
}

function calculateCredibilityMultiplier(secondaryEvidence) {
  const sourceCredibility = CONFIDENCE_MAP[secondaryEvidence.source_type] || PARAMS.BASELINE_CREDIBILITY;
  const hasNamedSources = /CEO|CFO|founder|president|named|quoted/i.test(secondaryEvidence.description);
  const namedBonus = hasNamedSources ? PARAMS.NAMED_SOURCE_BONUS : 1.0;
  const verifiedBonus = secondaryEvidence.status === 'verified' ? PARAMS.VERIFIED_BONUS : 1.0;
  const rawMultiplier = (sourceCredibility / PARAMS.BASELINE_CREDIBILITY) * namedBonus * verifiedBonus;
  return Math.min(1.5, Math.max(0.5, rawMultiplier));
}

function calculateWeightedBaseCase(primaryValue, primaryDate, secondaryEvidence, referenceDate = new Date()) {
  const secondaryValue = parseSecondaryValue(secondaryEvidence.value);

  if (!secondaryValue) {
    return { baseCase: primaryValue, weight: 0, breakdown: 'No valid secondary value' };
  }

  const adjustedSecondaryValue = secondaryValue * (1 - PARAMS.ILLIQUIDITY_DISCOUNT);
  const monthsSincePrimary = monthsSince(primaryDate, referenceDate);
  const monthsSinceSecondary = monthsSince(secondaryEvidence.date, referenceDate);
  const stalnessWeight = calculateStalnessWeight(monthsSincePrimary, monthsSinceSecondary);
  const credibilityMultiplier = calculateCredibilityMultiplier(secondaryEvidence);
  const rawWeight = stalnessWeight * credibilityMultiplier;
  const finalWeight = Math.min(PARAMS.MAX_SECONDARY_WEIGHT, Math.max(PARAMS.MIN_SECONDARY_WEIGHT, rawWeight));
  const baseCase = Math.round((1 - finalWeight) * primaryValue + finalWeight * adjustedSecondaryValue);

  return {
    baseCase,
    weight: finalWeight,
    breakdown: {
      primaryValue,
      primaryDate,
      monthsSincePrimary: monthsSincePrimary.toFixed(1),
      secondaryValueRaw: secondaryValue,
      secondaryValueAdjusted: adjustedSecondaryValue.toFixed(1),
      secondaryDate: secondaryEvidence.date,
      monthsSinceSecondary: monthsSinceSecondary.toFixed(1),
      stalnessWeight: stalnessWeight.toFixed(3),
      credibilityMultiplier: credibilityMultiplier.toFixed(3),
      finalWeight: finalWeight.toFixed(3),
      calculation: `(${(1 - finalWeight).toFixed(3)} × $${primaryValue}B) + (${finalWeight.toFixed(3)} × $${adjustedSecondaryValue.toFixed(1)}B) = $${baseCase}B`,
    },
  };
}

async function testFormula() {
  console.log('PRIMARY + SECONDARY WEIGHTING FORMULA - FINAL OUTPUTS');
  console.log('='.repeat(80));
  console.log();
  console.log('PARAMETERS:');
  console.log(`  Illiquidity discount: ${(PARAMS.ILLIQUIDITY_DISCOUNT * 100).toFixed(0)}% (always applied)`);
  console.log(`  Secondary weight bounds: ${(PARAMS.MIN_SECONDARY_WEIGHT * 100).toFixed(0)}%-${(PARAMS.MAX_SECONDARY_WEIGHT * 100).toFixed(0)}%`);
  console.log(`  Named source bonus: +${((PARAMS.NAMED_SOURCE_BONUS - 1) * 100).toFixed(0)}%`);
  console.log(`  Verified status bonus: +${((PARAMS.VERIFIED_BONUS - 1) * 100).toFixed(0)}%`);
  console.log();
  console.log('='.repeat(80));
  console.log();

  const testCompanies = ['SpaceX', 'Anthropic'];

  for (const name of testCompanies) {
    const { data: companies } = await supabase.from('lumen_companies').select('id, name').ilike('name', name);
    if (!companies || companies.length === 0) continue;
    
    const company = companies[0];

    const { data: primary } = await supabase.from('lumen_evidence').select('date, value').eq('company_id', company.id).eq('category', 'Funding').not('value', 'is', null).order('date', { ascending: false }).limit(1).single();
    const { data: secondary } = await supabase.from('lumen_evidence').select('*').eq('company_id', company.id).eq('category', 'Secondary').order('date', { ascending: false }).limit(1).single();
    const { data: currentVal } = await supabase.from('lumen_valuations').select('base_case').eq('company_id', company.id).order('generated_at', { ascending: false }).limit(1).single();

    if (!primary || !secondary) continue;

    const result = calculateWeightedBaseCase(parseFloat(primary.value), primary.date, secondary, new Date('2026-08-17'));

    console.log(`${company.name.toUpperCase()}`);
    console.log('-'.repeat(80));
    console.log(`Current AI base: $${currentVal?.base_case || '?'}B`);
    console.log(`Formula base:    $${result.baseCase}B`);
    console.log(`Difference:      ${currentVal ? ((result.baseCase - currentVal.base_case) >= 0 ? '+' : '') + (result.baseCase - currentVal.base_case) + 'B' : 'N/A'}`);
    console.log();
    console.log(`Primary:    $${result.breakdown.primaryValue}B (${result.breakdown.primaryDate}, ${result.breakdown.monthsSincePrimary}mo old)`);
    console.log(`Secondary:  $${result.breakdown.secondaryValueRaw}B → $${result.breakdown.secondaryValueAdjusted}B after discount`);
    console.log(`            (${result.breakdown.secondaryDate}, ${result.breakdown.monthsSinceSecondary}mo old)`);
    console.log(`            ${secondary.source_type}, ${secondary.status}`);
    console.log();
    console.log(`Staleness weight:      ${result.breakdown.stalnessWeight}`);
    console.log(`Credibility multiplier: ${result.breakdown.credibilityMultiplier}`);
    console.log(`Final weight:          ${result.breakdown.finalWeight}`);
    console.log();
    console.log(`${result.breakdown.calculation}`);
    console.log();
    console.log('='.repeat(80));
    console.log();
  }

  console.log('SANITY CHECKS:');
  console.log('  □ SpaceX (stale primary) has higher secondary weight than Anthropic (fresh)?');
  console.log('  □ Both base cases are within reasonable bounds?');
  console.log('  □ Illiquidity discount applied to both?');
  console.log('  □ Formula outputs differ from AI outputs (showing inconsistency)?');
}

testFormula().catch(console.error);
