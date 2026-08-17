#!/usr/bin/env node

const SITE_URL = 'http://localhost:3003';
const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';

console.log('Regenerating Anthropic valuation with corrected evidence...\n');

const response = await fetch(`${SITE_URL}/api/lumen/companies/${ANTHROPIC_ID}/valuation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({})
});

if (!response.ok) {
  console.log(`❌ Error: ${response.status}`);
  console.log(await response.text());
  process.exit(1);
}

const { valuation } = await response.json();

console.log('✓ Valuation regenerated\n');
console.log('='.repeat(80));
console.log('VERIFICATION: No $1.5T in Output');
console.log('='.repeat(80));
console.log();

// Check for $1.5T anywhere in the output
const fullOutput = JSON.stringify(valuation);
const has1_5T = fullOutput.includes('1.5T') || fullOutput.includes('1.5 T') || fullOutput.includes('1500B') || fullOutput.includes('1,500');

console.log(`Base case: $${valuation.base_case}B`);
console.log(`Bull case: $${valuation.bull_case}B`);
console.log(`Bear case: $${valuation.bear_case}B`);
console.log(`Confidence: ${valuation.confidence_score}/100`);
console.log();

console.log('Key drivers:');
valuation.key_drivers?.forEach((d, i) => {
  console.log(`${i + 1}. ${d.impact} ${d.label}`);
  console.log(`   ${d.note}`);
  console.log();
});

console.log('Explanation:');
console.log(valuation.explanation);
console.log();

console.log('='.repeat(80));
if (has1_5T) {
  console.log('❌ FOUND $1.5T IN OUTPUT - Evidence correction did not propagate');
  console.log('   Search for "1.5T" or "1500" in output above');
} else {
  console.log('✅ VERIFIED: No $1.5T in output');
  console.log('   Bull case and drivers should reference $1.2T (corrected value)');
}
console.log('='.repeat(80));
