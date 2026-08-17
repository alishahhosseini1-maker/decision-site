#!/usr/bin/env node

const SITE_URL = 'https://decisionlayer.dev';
const ANDURIL_ID = 'f848c33d-217f-44fc-b1fb-2e85f1faceeb';

console.log('Triggering valuation generation for Anduril...\n');

const response = await fetch(`${SITE_URL}/api/lumen/companies/${ANDURIL_ID}/valuation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}) // No asOf - run fresh valuation
});

if (!response.ok) {
  console.log('❌ Error calling API:');
  const error = await response.json();
  console.log(JSON.stringify(error, null, 2));
} else {
  const result = await response.json();
  console.log('✓ Valuation generated:');
  console.log(`  Base case: $${result.valuation.base_case}B`);
  console.log(`  Bear case: $${result.valuation.bear_case}B`);
  console.log(`  Bull case: $${result.valuation.bull_case}B`);
  console.log(`  Confidence: ${result.valuation.confidence_score}/100`);
  console.log();
  console.log('Key drivers:');
  result.valuation.key_drivers?.forEach(d => {
    console.log(`  ${d.impact === '+' ? '📈' : '📉'} ${d.label}: ${d.note}`);
  });
  console.log();
  console.log('Explanation:');
  console.log(`  ${result.valuation.explanation}`);
}
