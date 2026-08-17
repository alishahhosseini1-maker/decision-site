#!/usr/bin/env node

const SITE_URL = 'http://localhost:3003'; // Use local dev if running, else production
const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';

console.log('Regenerating Anthropic valuation with corrected secondary evidence...\n');

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
console.log('RESULTS');
console.log('='.repeat(80));
console.log(`Base: $${valuation.base_case}B`);
console.log(`Bear: $${valuation.bear_case}B`);
console.log(`Bull: $${valuation.bull_case}B`);
console.log(`Confidence: ${valuation.confidence_score}/100`);
console.log();

console.log('Key drivers:');
valuation.key_drivers?.forEach(d => {
  console.log(`${d.impact} ${d.label}`);
  console.log(`  ${d.note.substring(0, 200)}${d.note.length > 200 ? '...' : ''}`);
  console.log();
});

console.log('Explanation:');
console.log(valuation.explanation);
console.log();

console.log('='.repeat(80));
console.log('SECONDARY WEIGHTING CHECK');
console.log('='.repeat(80));
console.log();
console.log('Base case ($965B) should anchor to Series H primary, not secondary.');
console.log('Bull case should reflect secondary signal (now $1.2T, not $1.5T).');
console.log('Reasoning should explicitly note secondary discount for thin liquidity.');
