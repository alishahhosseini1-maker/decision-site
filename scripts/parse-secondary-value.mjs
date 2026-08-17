#!/usr/bin/env node

/**
 * Parse secondary evidence value field (which has inconsistent formats)
 */
function parseSecondaryValue(valueField) {
  if (!valueField) return null;

  const str = valueField.toString().toUpperCase();

  // Format 1: "$1.2T" or "1.2T" → 1200B
  if (str.includes('T')) {
    const match = str.match(/([\d.]+)\s*T/);
    if (match) return parseFloat(match[1]) * 1000;
  }

  // Format 2: "$800B" or "800B" → 800B
  if (str.includes('B') && !str.includes('BILLION')) {
    const match = str.match(/([\d.]+)\s*B/);
    if (match) return parseFloat(match[1]);
  }

  // Format 3: "800000000000" (raw number as string) → convert from dollars to billions
  const asNumber = parseFloat(str);
  if (!isNaN(asNumber)) {
    // If number is very large (>1000), assume it's in dollars not billions
    if (asNumber > 1000) {
      return asNumber / 1000000000; // Convert dollars to billions
    }
    return asNumber; // Already in billions
  }

  // Format 4: Long text with embedded valuation
  // "$350,000,000,000 valuation" → 350B
  const largeNumberMatch = str.match(/\$?([\d,]+),000,000,000/);
  if (largeNumberMatch) {
    const num = largeNumberMatch[1].replace(/,/g, '');
    return parseFloat(num);
  }

  return null;
}

// Test cases
const testCases = [
  "800000000000", // SpaceX
  "Employee tender offer of approximately $5–6 billion in secondary sales at an implied ~$350,000,000,000 valuation (approximate; tender structured in February 2026)", // Anthropic Feb
  "$1.2T secondary market valuation", // Anthropic July
];

console.log('Value parsing tests:\n');
testCases.forEach((test, i) => {
  const parsed = parseSecondaryValue(test);
  console.log(`${i + 1}. Input: "${test.substring(0, 60)}${test.length > 60 ? '...' : ''}"`);
  console.log(`   Parsed: $${parsed}B`);
  console.log();
});
