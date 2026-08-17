#!/usr/bin/env node

/**
 * Test valuation parser fix for millions handling
 */

import { parseValuationFromText, parseFundingAmountFromText } from '../app/lib/valuationParser.js';

console.log('========================================');
console.log('VALUATION PARSER TEST');
console.log('========================================\n');

const testCases = [
  // Known failures from Multiply Labs
  {
    description: 'Multiply Labs raised $25.04M at a $60M post-money valuation in April 2021',
    expectedValuation: 0.06, // $60M = 0.06B
    expectedFunding: 0.02504 // $25.04M = 0.02504B
  },
  {
    description: 'Multiply Labs raised $20M at an undisclosed post-money valuation',
    expectedValuation: null, // Undisclosed
    expectedFunding: 0.02 // $20M = 0.02B
  },
  // Test billions still work
  {
    description: 'Company raised $6.6B at a $157B post-money valuation',
    expectedValuation: 157,
    expectedFunding: 6.6
  },
  // Test various formats
  {
    description: 'Raised $800M at $2.5B valuation',
    expectedValuation: 2.5,
    expectedFunding: 0.8
  },
  {
    description: 'Series A of $15M at $75 million post-money valuation',
    expectedValuation: 0.075, // $75M = 0.075B
    expectedFunding: 0.015 // $15M = 0.015B
  }
];

console.log('Testing parser on known cases:\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}:`);
  console.log(`  Input: "${testCase.description}"`);

  const valuation = parseValuationFromText(testCase.description);
  const funding = parseFundingAmountFromText(testCase.description);

  const valuationPass = testCase.expectedValuation === null
    ? valuation === null
    : Math.abs((valuation || 0) - testCase.expectedValuation) < 0.001;

  const fundingPass = testCase.expectedFunding === null
    ? funding === null
    : Math.abs((funding || 0) - testCase.expectedFunding) < 0.001;

  console.log(`  Expected valuation: ${testCase.expectedValuation}B`);
  console.log(`  Parsed valuation:   ${valuation}B ${valuationPass ? '✓' : '✗ FAIL'}`);
  console.log(`  Expected funding:   ${testCase.expectedFunding}B`);
  console.log(`  Parsed funding:     ${funding}B ${fundingPass ? '✓' : '✗ FAIL'}`);

  if (valuationPass && fundingPass) {
    passCount++;
    console.log(`  Result: ✓ PASS`);
  } else {
    failCount++;
    console.log(`  Result: ✗ FAIL`);
  }
  console.log();
});

console.log('========================================');
console.log(`Results: ${passCount}/${testCases.length} passed`);
console.log('========================================\n');

if (failCount === 0) {
  console.log('✓ All tests passed! Parser now handles millions correctly.');
  console.log('\nNext step: Re-research companies to capture previously missed valuations');
} else {
  console.log(`✗ ${failCount} tests failed. Parser needs more work.`);
}
