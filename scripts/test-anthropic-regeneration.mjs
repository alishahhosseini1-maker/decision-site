#!/usr/bin/env node

/**
 * Regenerate Anthropic valuation and verify formula produces expected $971B
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Source credibility map (from lumen.ts)
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

const PRIMARY_SECONDARY_PARAMS = {
  ILLIQUIDITY_DISCOUNT: 0.15,
  STALENESS_THRESHOLD: 20,
  MIN_SECONDARY_WEIGHT: 0.10,
  MAX_SECONDARY_WEIGHT: 0.70,
  BASELINE_CREDIBILITY: 75,
  NAMED_SOURCE_BONUS: 1.15,
  VERIFIED_BONUS: 1.10,
  MAX_CREDIBILITY_MULTIPLIER: 1.5,
};

function monthsSince(dateStr, referenceDate = new Date()) {
  if (!dateStr) return 999;
  const then = new Date(dateStr);
  const months = (referenceDate - then) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, months);
}

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
    if (asNumber > 1000) return asNumber / 1000000000;
    return asNumber;
  }

  return null;
}

function calculatePrimarySecondaryBaseCase(primaryValue, primaryDate, secondaryEvidence, referenceDate = new Date()) {
  const secondaryValue = parseSecondaryValue(secondaryEvidence.value);
  if (!secondaryValue || !secondaryEvidence.date) {
    return null;
  }

  // 1. Apply illiquidity discount
  const adjustedSecondary = secondaryValue * (1 - PRIMARY_SECONDARY_PARAMS.ILLIQUIDITY_DISCOUNT);

  // 2. Calculate staleness weights
  const monthsSincePrimary = monthsSince(primaryDate, referenceDate);
  const monthsSinceSecondary = monthsSince(secondaryEvidence.date, referenceDate);

  const relativeWeight = monthsSincePrimary / (monthsSincePrimary + monthsSinceSecondary + 1);
  const absoluteFactor = Math.min(1.0, monthsSincePrimary / PRIMARY_SECONDARY_PARAMS.STALENESS_THRESHOLD);
  const stalnessWeight = relativeWeight * absoluteFactor;

  // 3. Calculate credibility multiplier
  const sourceCredibility = CONFIDENCE_MAP[secondaryEvidence.source_type] ?? PRIMARY_SECONDARY_PARAMS.BASELINE_CREDIBILITY;
  const hasNamedSources = /CEO|CFO|founder|president|named|quoted/i.test(secondaryEvidence.description);
  const namedBonus = hasNamedSources ? PRIMARY_SECONDARY_PARAMS.NAMED_SOURCE_BONUS : 1.0;
  const verifiedBonus = secondaryEvidence.status === 'verified' ? PRIMARY_SECONDARY_PARAMS.VERIFIED_BONUS : 1.0;

  let credibilityMultiplier = (sourceCredibility / PRIMARY_SECONDARY_PARAMS.BASELINE_CREDIBILITY) * namedBonus * verifiedBonus;
  credibilityMultiplier = Math.min(PRIMARY_SECONDARY_PARAMS.MAX_CREDIBILITY_MULTIPLIER, Math.max(0.5, credibilityMultiplier));

  // 4. Calculate final weight
  const rawWeight = stalnessWeight * credibilityMultiplier;
  const finalWeight = Math.min(
    PRIMARY_SECONDARY_PARAMS.MAX_SECONDARY_WEIGHT,
    Math.max(PRIMARY_SECONDARY_PARAMS.MIN_SECONDARY_WEIGHT, rawWeight)
  );

  // 5. Weighted base case
  const baseCase = Math.round((1 - finalWeight) * primaryValue + finalWeight * adjustedSecondary);

  return {
    baseCase,
    weight: finalWeight,
    breakdown: {
      monthsSincePrimary: monthsSincePrimary.toFixed(1),
      monthsSinceSecondary: monthsSinceSecondary.toFixed(1),
      relativeWeight: relativeWeight.toFixed(3),
      absoluteFactor: absoluteFactor.toFixed(3),
      stalnessWeight: stalnessWeight.toFixed(3),
      credibilityMultiplier: credibilityMultiplier.toFixed(3),
      finalWeight: finalWeight.toFixed(3),
      adjustedSecondary: adjustedSecondary.toFixed(1),
    }
  };
}

async function regenerateAnthropic() {
  console.log('ANTHROPIC VALUATION REGENERATION TEST');
  console.log('='.repeat(80));
  console.log();

  // Get company (use exact ID to avoid case-sensitivity issues)
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('*')
    .eq('id', '9bc85cca-71fe-48db-ac09-8b32b03275d3')
    .single();

  if (!company) {
    console.log('ERROR: Anthropic not found');
    return;
  }

  // Get old valuation
  const { data: oldVal } = await supabase
    .from('lumen_valuations')
    .select('*')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  console.log('BEFORE REGENERATION:');
  if (oldVal) {
    console.log(`  Base case: $${oldVal.base_case}B`);
    console.log(`  Generated: ${oldVal.generated_at}`);
  } else {
    console.log('  (no prior valuation)');
  }
  console.log();

  // Get secondary evidence
  const { data: secondaryEv } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .eq('category', 'Secondary')
    .eq('status', 'verified')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!secondaryEv) {
    console.log('ERROR: No secondary evidence found');
    return;
  }

  console.log('INPUTS:');
  console.log(`  Primary: $${company.last_round_value}B (${company.last_round_date})`);
  console.log(`  Secondary: "${secondaryEv.value}" (${secondaryEv.date})`);
  console.log(`    Source: ${secondaryEv.source_type}`);
  console.log(`    Status: ${secondaryEv.status}`);
  console.log();

  // Calculate expected formula output
  const referenceDate = new Date();
  const formula = calculatePrimarySecondaryBaseCase(
    company.last_round_value,
    company.last_round_date,
    secondaryEv,
    referenceDate
  );

  console.log('FORMULA CALCULATION:');
  console.log(`  Primary age: ${formula.breakdown.monthsSincePrimary}mo`);
  console.log(`  Secondary age: ${formula.breakdown.monthsSinceSecondary}mo`);
  console.log(`  Relative staleness: ${formula.breakdown.relativeWeight}`);
  console.log(`  Absolute factor: ${formula.breakdown.absoluteFactor} (${formula.breakdown.monthsSincePrimary}mo / 20mo)`);
  console.log(`  Staleness weight: ${formula.breakdown.stalnessWeight}`);
  console.log(`  Credibility multiplier: ${formula.breakdown.credibilityMultiplier}`);
  console.log(`  Final weight: ${formula.breakdown.finalWeight} (${(formula.weight * 100).toFixed(1)}% secondary)`);
  console.log(`  Adjusted secondary: $${formula.breakdown.adjustedSecondary}B (85% of $${parseSecondaryValue(secondaryEv.value)}B)`);
  console.log();
  console.log(`  EXPECTED BASE CASE: $${formula.baseCase}B`);
  console.log();

  // Trigger actual regeneration via API
  console.log('Triggering regeneration via API...');
  console.log();

  const response = await fetch(`http://localhost:3003/api/lumen/valuations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ companyId: company.id }),
  });

  if (!response.ok) {
    console.log('ERROR: API call failed:', response.status, response.statusText);
    console.log();
    console.log('Falling back to manual calculation...');
    console.log();
    console.log('='.repeat(80));
    console.log('FORMULA VERIFICATION:');
    console.log(`  Expected: $${formula.baseCase}B`);
    console.log('  (Cannot verify actual output - API unavailable)');
    return;
  }

  const result = await response.json();

  if (result.error) {
    console.log('ERROR:', result.error);
    return;
  }

  console.log('='.repeat(80));
  console.log('RESULT:');
  console.log(`  Base case: $${result.valuation.base_case}B`);
  console.log(`  Bear case: $${result.valuation.bear_case}B`);
  console.log(`  Bull case: $${result.valuation.bull_case}B`);
  console.log(`  Confidence: ${result.valuation.confidence_score}`);
  console.log();

  console.log('='.repeat(80));
  console.log('VERIFICATION:');
  console.log(`  Expected (formula): $${formula.baseCase}B`);
  console.log(`  Actual (API):       $${result.valuation.base_case}B`);

  const diff = Math.abs(result.valuation.base_case - formula.baseCase);
  if (diff <= 5) {
    console.log(`  ✓ MATCH (within tolerance)`);
  } else {
    console.log(`  ✗ MISMATCH (difference: $${diff}B)`);
    console.log();
    console.log('  Possible causes:');
    console.log('    - Formula not being applied (check both primary+secondary exist)');
    console.log('    - Different reference dates');
    console.log('    - Value parsing issue');
  }
}

regenerateAnthropic().catch(console.error);
