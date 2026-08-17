/**
 * Primary + Secondary Weighting Formula
 *
 * Shared calculation used by:
 * - Backend (valuation.ts) to compute base case
 * - Frontend (page.tsx) to display formula breakdown
 *
 * SINGLE SOURCE OF TRUTH: Any parameter changes must be made here only.
 */

import { CONFIDENCE_MAP } from './lumen';

export const FORMULA_PARAMS = {
  ILLIQUIDITY_DISCOUNT: 0.15, // 15% haircut on secondary (GUESS - see SESSION-SUMMARY.md)
  STALENESS_THRESHOLD: 20, // months (GROUNDED - from session staleness analysis)
  MIN_SECONDARY_WEIGHT: 0.10, // Floor (GUESS - design choice)
  MAX_SECONDARY_WEIGHT: 0.70, // Cap (GUESS - design choice)
  BASELINE_CREDIBILITY: 75, // Industry Research (GROUNDED - from CONFIDENCE_MAP)
  NAMED_SOURCE_BONUS: 1.15, // +15% for named sources (GUESS)
  VERIFIED_BONUS: 1.10, // +10% for verified status (GUESS)
  MAX_CREDIBILITY_MULTIPLIER: 1.5, // Cap (GUESS - design choice)
} as const;

export type FormulaMetadata = {
  primaryValue: number;
  primaryDate: string;
  secondaryValue: number;
  secondaryDate: string;
  primaryWeight: number;
  secondaryWeight: number;
  illiquidityDiscount: number;
  adjustedSecondary: number;
  baseCase: number;
  monthsSincePrimary: number;
  monthsSinceSecondary: number;
};

type SecondaryEvidence = {
  value: string | null;
  date: string | null;
  description?: string;
  source_type: string;
  status: string;
};

/**
 * Parse secondary evidence value field (inconsistent formats).
 * Returns value in billions, or null if unparseable.
 */
export function parseSecondaryValue(valueField: string | null): number | null {
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

/**
 * Calculate months since a date.
 */
export function monthsSince(dateStr: string | null, referenceDate?: string | Date): number {
  if (!dateStr) return 999; // Treat missing date as very stale
  const then = new Date(dateStr);
  const ref = referenceDate ? new Date(referenceDate) : new Date();
  const months = (ref.getTime() - then.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return Math.max(0, months);
}

/**
 * Calculate primary+secondary weighted base case with full metadata.
 *
 * Returns null if no valid secondary value can be parsed.
 */
export function calculateFormulaMetadata(
  primaryValue: number,
  primaryDate: string,
  secondaryEvidence: SecondaryEvidence,
  referenceDate?: string
): FormulaMetadata | null {
  const secondaryValue = parseSecondaryValue(secondaryEvidence.value);
  if (!secondaryValue || !secondaryEvidence.date) {
    return null; // Cannot weight without valid secondary
  }

  // 1. Apply illiquidity discount to secondary
  const adjustedSecondary = secondaryValue * (1 - FORMULA_PARAMS.ILLIQUIDITY_DISCOUNT);

  // 2. Calculate staleness weights
  const monthsSincePrimary = monthsSince(primaryDate, referenceDate);
  const monthsSinceSecondary = monthsSince(secondaryEvidence.date, referenceDate);

  // Relative staleness (higher when primary is older than secondary)
  const relativeWeight = monthsSincePrimary / (monthsSincePrimary + monthsSinceSecondary + 1);

  // Absolute staleness factor (prevents fresh primaries from getting high weights)
  const absoluteFactor = Math.min(1.0, monthsSincePrimary / FORMULA_PARAMS.STALENESS_THRESHOLD);

  // Combined staleness weight
  const stalnessWeight = relativeWeight * absoluteFactor;

  // 3. Calculate credibility multiplier
  const sourceCredibility = CONFIDENCE_MAP[secondaryEvidence.source_type] ?? FORMULA_PARAMS.BASELINE_CREDIBILITY;
  const hasNamedSources = /CEO|CFO|founder|president|named|quoted/i.test(secondaryEvidence.description || '');
  const namedBonus = hasNamedSources ? FORMULA_PARAMS.NAMED_SOURCE_BONUS : 1.0;
  const verifiedBonus = secondaryEvidence.status === 'verified' ? FORMULA_PARAMS.VERIFIED_BONUS : 1.0;

  let credibilityMultiplier = (sourceCredibility / FORMULA_PARAMS.BASELINE_CREDIBILITY) * namedBonus * verifiedBonus;
  credibilityMultiplier = Math.min(FORMULA_PARAMS.MAX_CREDIBILITY_MULTIPLIER, Math.max(0.5, credibilityMultiplier));

  // 4. Calculate final weight (bounded)
  const rawWeight = stalnessWeight * credibilityMultiplier;
  const secondaryWeight = Math.min(
    FORMULA_PARAMS.MAX_SECONDARY_WEIGHT,
    Math.max(FORMULA_PARAMS.MIN_SECONDARY_WEIGHT, rawWeight)
  );
  const primaryWeight = 1 - secondaryWeight;

  // 5. Weighted base case
  const baseCase = Math.round(primaryWeight * primaryValue + secondaryWeight * adjustedSecondary);

  return {
    primaryValue,
    primaryDate,
    secondaryValue,
    secondaryDate: secondaryEvidence.date,
    primaryWeight,
    secondaryWeight,
    illiquidityDiscount: FORMULA_PARAMS.ILLIQUIDITY_DISCOUNT,
    adjustedSecondary,
    baseCase,
    monthsSincePrimary,
    monthsSinceSecondary,
  };
}
