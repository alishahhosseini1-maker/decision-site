#!/usr/bin/env node

/**
 * PRIMARY + SECONDARY WEIGHTING FORMULA
 *
 * Deterministic formula for combining primary round valuations with
 * secondary market evidence in base case calculations.
 *
 * Replaces AI-based "balancing" with explicit, consistent rules.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

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

/**
 * FORMULA PARAMETERS
 */
const PARAMS = {
  // Staleness weight bounds
  MIN_SECONDARY_WEIGHT: 0.10, // Floor: even fresh primary can't fully drown out secondary
  MAX_SECONDARY_WEIGHT: 0.70, // Cap: extremely stale primary can't push to 100% secondary

  // Illiquidity discount
  ILLIQUIDITY_DISCOUNT: 0.15, // 15% haircut on secondary value (always applied)

  // Credibility scaling
  BASELINE_CREDIBILITY: 75, // Industry Research (neutral baseline)

  // Named source bonus
  NAMED_SOURCE_BONUS: 1.15, // 15% boost for named sources

  // Verification bonus
  VERIFIED_BONUS: 1.10, // 10% boost for verified status
};

/**
 * Calculate months since a date
 */
function monthsSince(dateStr, referenceDate = new Date()) {
  if (!dateStr) return 999; // Treat missing date as very stale
  const then = new Date(dateStr);
  const months = (referenceDate - then) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, months);
}

/**
 * Calculate staleness-based weight for secondary evidence
 *
 * Returns higher weight when:
 * - Primary is stale relative to secondary
 * - Secondary is recent
 */
function calculateStalnessWeight(monthsSincePrimary, monthsSinceSecondary) {
  // Raw staleness ratio (0-1)
  // If primary is much older than secondary, ratio approaches 1
  // If both equally fresh, ratio is ~0.5
  const denominator = monthsSincePrimary + monthsSinceSecondary + 1; // +1 prevents division by zero
  const rawRatio = monthsSincePrimary / denominator;

  // Apply bounds
  return Math.min(
    PARAMS.MAX_SECONDARY_WEIGHT,
    Math.max(PARAMS.MIN_SECONDARY_WEIGHT, rawRatio)
  );
}

/**
 * Calculate credibility multiplier for secondary evidence
 *
 * Factors:
 * - Source type credibility (Reputable Publication > Industry Research > etc.)
 * - Named vs anonymous sourcing
 * - Verification status
 */
function calculateCredibilityMultiplier(secondaryEvidence) {
  // Base credibility from source type
  const sourceCredibility = CONFIDENCE_MAP[secondaryEvidence.source_type] || PARAMS.BASELINE_CREDIBILITY;

  // Check for named sources in description
  const hasNamedSources = /CEO|CFO|founder|president|named|quoted/i.test(secondaryEvidence.description);
  const namedBonus = hasNamedSources ? PARAMS.NAMED_SOURCE_BONUS : 1.0;

  // Verification status
  const verifiedBonus = secondaryEvidence.status === 'verified' ? PARAMS.VERIFIED_BONUS : 1.0;

  // Calculate multiplier (normalized to 1.0 at baseline)
  const rawMultiplier = (sourceCredibility / PARAMS.BASELINE_CREDIBILITY) * namedBonus * verifiedBonus;

  // Bound multiplier to reasonable range (0.5 - 1.5)
  return Math.min(1.5, Math.max(0.5, rawMultiplier));
}

/**
 * Calculate weighted base case from primary and secondary evidence
 */
function calculateWeightedBaseCase(primaryValue, primaryDate, secondaryEvidence, referenceDate = new Date()) {
  // Parse secondary value
  let secondaryValue = parseFloat(secondaryEvidence.value);
  if (isNaN(secondaryValue)) {
    // Try parsing from description if value field is text
    const match = secondaryEvidence.value?.match(/[\d.]+/);
    secondaryValue = match ? parseFloat(match[0]) : null;
  }

  if (!secondaryValue) {
    // No valid secondary value - fall back to primary only
    return {
      baseCase: primaryValue,
      weight: 0,
      breakdown: 'No valid secondary value - using primary only',
    };
  }

  // Step 1: Apply illiquidity discount to secondary
  const adjustedSecondaryValue = secondaryValue * (1 - PARAMS.ILLIQUIDITY_DISCOUNT);

  // Step 2: Calculate staleness weight
  const monthsSincePrimary = monthsSince(primaryDate, referenceDate);
  const monthsSinceSecondary = monthsSince(secondaryEvidence.date, referenceDate);
  const stalnessWeight = calculateStalnessWeight(monthsSincePrimary, monthsSinceSecondary);

  // Step 3: Calculate credibility multiplier
  const credibilityMultiplier = calculateCredibilityMultiplier(secondaryEvidence);

  // Step 4: Combine weights
  const rawWeight = stalnessWeight * credibilityMultiplier;
  const finalWeight = Math.min(
    PARAMS.MAX_SECONDARY_WEIGHT,
    Math.max(PARAMS.MIN_SECONDARY_WEIGHT, rawWeight)
  );

  // Step 5: Calculate weighted base case
  const baseCase = Math.round(
    (1 - finalWeight) * primaryValue + finalWeight * adjustedSecondaryValue
  );

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

/**
 * Test formula against companies with both primary + secondary
 */
async function testFormula() {
  console.log('PRIMARY + SECONDARY WEIGHTING FORMULA - PROJECTED OUTPUTS');
  console.log('='.repeat(80));
  console.log();

  console.log('FORMULA PARAMETERS:');
  console.log(`  Illiquidity discount: ${(PARAMS.ILLIQUIDITY_DISCOUNT * 100).toFixed(0)}% (always applied to secondary)`);
  console.log(`  Secondary weight bounds: ${(PARAMS.MIN_SECONDARY_WEIGHT * 100).toFixed(0)}% - ${(PARAMS.MAX_SECONDARY_WEIGHT * 100).toFixed(0)}%`);
  console.log(`  Named source bonus: ${((PARAMS.NAMED_SOURCE_BONUS - 1) * 100).toFixed(0)}%`);
  console.log(`  Verified status bonus: ${((PARAMS.VERIFIED_BONUS - 1) * 100).toFixed(0)}%`);
  console.log();
  console.log('='.repeat(80));
  console.log();

  const testCompanies = ['SpaceX', 'Anthropic'];

  for (const name of testCompanies) {
    const { data: company } = await supabase
      .from('lumen_companies')
      .select('id, name')
      .ilike('name', name)
      .single();

    if (!company) continue;

    // Get most recent primary
    const { data: primary } = await supabase
      .from('lumen_evidence')
      .select('date, value')
      .eq('company_id', company.id)
      .eq('category', 'Funding')
      .not('value', 'is', null)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Get most recent secondary
    const { data: secondary } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', company.id)
      .eq('category', 'Secondary')
      .order('date', { ascending: false })
      .limit(1)
      .single();

    // Get current base case
    const { data: currentVal } = await supabase
      .from('lumen_valuations')
      .select('base_case')
      .eq('company_id', company.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (!primary || !secondary) continue;

    const result = calculateWeightedBaseCase(
      parseFloat(primary.value),
      primary.date,
      secondary,
      new Date('2026-08-17') // Reference date for consistent testing
    );

    console.log(`${company.name.toUpperCase()}`);
    console.log('-'.repeat(80));
    console.log(`Current AI base case: $${currentVal?.base_case || 'unknown'}B`);
    console.log(`Formula base case: $${result.baseCase}B`);
    console.log();
    console.log('Inputs:');
    console.log(`  Primary: $${result.breakdown.primaryValue}B (${result.breakdown.primaryDate})`);
    console.log(`    Age: ${result.breakdown.monthsSincePrimary} months`);
    console.log(`  Secondary (raw): $${result.breakdown.secondaryValueRaw}B (${result.breakdown.secondaryDate})`);
    console.log(`    Age: ${result.breakdown.monthsSinceSecondary} months`);
    console.log(`    Source: ${secondary.source_type}`);
    console.log(`    Status: ${secondary.status}`);
    console.log(`    Has named sources: ${/CEO|CFO|founder|president|named|quoted/i.test(secondary.description)}`);
    console.log();
    console.log('Calculation:');
    console.log(`  1. Illiquidity discount: $${result.breakdown.secondaryValueRaw}B × 0.85 = $${result.breakdown.secondaryValueAdjusted}B`);
    console.log(`  2. Staleness weight: ${result.breakdown.stalnessWeight}`);
    console.log(`  3. Credibility multiplier: ${result.breakdown.credibilityMultiplier}`);
    console.log(`  4. Final weight: ${result.breakdown.finalWeight} (bounded)`);
    console.log(`  5. ${result.breakdown.calculation}`);
    console.log();
    console.log('='.repeat(80));
    console.log();
  }

  console.log('MANUAL INSPECTION CHECKLIST:');
  console.log('  □ Do the weights make intuitive sense given staleness gaps?');
  console.log('  □ Does SpaceX (stale primary) get higher secondary weight than Anthropic (fresh primary)?');
  console.log('  □ Are the base cases within reasonable bounds (not extreme)?');
  console.log('  □ Is the illiquidity discount being applied consistently?');
}

testFormula().catch(console.error);
