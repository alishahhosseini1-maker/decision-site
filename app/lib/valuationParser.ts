/**
 * Extracts valuation amounts from text and normalizes to billions.
 * Used for Funding evidence to populate the `value` field.
 */

/**
 * Parses valuation from description text.
 * Returns valuation in billions, or null if not found.
 *
 * Patterns matched:
 * - "valued at $18B"
 * - "at a $157 billion valuation"
 * - "valuation of $40.5 billion"
 * - "$110B valuation"
 * - "raised at $852 billion"
 */
export function parseValuationFromText(text: string): number | null {
  if (!text) return null;

  // Pattern 0: "at $X post-money" or "$X post-money valuation" (HIGHEST PRIORITY)
  // Matches: "$965B post-money", "$60M post-money", "at $380B post-money"
  const postMoneyPattern = /(?:at\s+a?\s*)?\$\s*([\d,.]+)\s*([MB]|billion|million)\s+post-money/i;
  let match = text.match(postMoneyPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    // Convert millions to billions
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  // Pattern 1: "valued at $X" or "valuation of $X"
  const valuationPattern = /(?:valued at|valuation of|valuation:|at a)\s*\$?\s*([\d,.]+)\s*([MB]|billion|million)(?:\s|,|\.|\))/i;
  match = text.match(valuationPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  // Pattern 2: "$X valuation"
  const reversePattern = /\$\s*([\d,.]+)\s*([MB]|billion|million)\s+valuation/i;
  match = text.match(reversePattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  // Pattern 3: "raised at $X" (funding round context)
  const raisedPattern = /raised at\s*\$?\s*([\d,.]+)\s*([MB]|billion|million)/i;
  match = text.match(raisedPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  // Pattern 4: Just "$XB" or "$X billion" anywhere in text (looser fallback)
  // BUT exclude if it's part of "raised $XB" (that's funding amount, not valuation)
  const loosePattern = /\$\s*([\d,.]+)\s*(?:billion|B)(?:\s|,|\.|\)|$)/i;
  match = text.match(loosePattern);
  if (match) {
    // Check if this is preceded by "raised" or "raising" - if so, skip (it's funding amount)
    const beforeMatch = text.substring(0, match.index || 0).toLowerCase();
    if (beforeMatch.match(/(?:raised|raising|raise)\s*$/)) {
      return null; // This is funding amount, not valuation
    }

    const value = parseFloat(match[1].replace(/,/g, ''));
    // Only accept if reasonable (0.1B to 10,000B)
    if (value >= 0.1 && value <= 10000) {
      return value;
    }
  }

  return null;
}

/**
 * Extracts the amount raised (funding amount) from text.
 * Returns amount in billions, or null if not found.
 *
 * Patterns matched:
 * - "raised $6.6B" or "raised $6.6 billion"
 * - "raising $40 billion"
 * - "$122B funding round"
 * - "$65B raise"
 */
export function parseFundingAmountFromText(text: string): number | null {
  if (!text) return null;

  // Pattern 1: "raised/raising $X"
  const raisedPattern = /(?:raised|raising|raise of)\s*\$\s*([\d,.]+)\s*([MB]|billion|million)/i;
  let match = text.match(raisedPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  // Pattern 2: "$X funding round" or "$X round"
  const fundingRoundPattern = /\$\s*([\d,.]+)\s*([MB]|billion|million)\s+(?:funding round|round|raise)/i;
  match = text.match(fundingRoundPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  // Pattern 3: "new funding of $X" or "funding round of $X"
  const ofPattern = /(?:funding|round)\s+of\s+\$\s*([\d,.]+)\s*([MB]|billion|million)/i;
  match = text.match(ofPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  return null;
}

/**
 * Extracts round type from text.
 * Returns the round type (e.g., "Series C") or null.
 */
export function parseRoundTypeFromText(text: string): string | null {
  if (!text) return null;

  // Match common round types
  const roundPattern = /\b(Pre-seed|Seed|Series [A-H]|Series [A-H]-?\d*|Round [A-H]|Bridge|Growth|Late-stage)\b/i;
  const match = text.match(roundPattern);

  if (match) {
    return match[1];
  }

  return null;
}
