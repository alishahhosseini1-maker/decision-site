#!/usr/bin/env node

/**
 * Run Benchmark Valuation
 *
 * Usage: node run-valuation.mjs <company-name> [--update]
 *
 * Runs a valuation for a company using only evidence before the cutoff date.
 * Non-destructive - filters evidence by date without deleting from database.
 *
 * Examples:
 *   node run-valuation.mjs "Anthropic"
 *   node run-valuation.mjs "Plaid" --update
 */

import { readFileSync, writeFileSync } from 'fs';

const SITE_URL = process.env.SITE_URL || 'https://decisionlayer.dev';
const companyName = process.argv[2];
const shouldUpdate = process.argv.includes('--update');

if (!companyName) {
  console.error('Usage: node run-valuation.mjs <company-name> [--update]');
  console.error('Example: node run-valuation.mjs "Anthropic" --update');
  process.exit(1);
}

// Load test companies
const testData = JSON.parse(readFileSync('test-companies.json', 'utf8'));
const allCompanies = [
  ...(testData.tiers.tier1_famous.companies || []),
  ...(testData.tiers.tier2_less_famous.companies || [])
];

const company = allCompanies.find(c => c.name.toLowerCase() === companyName.toLowerCase());

if (!company) {
  console.error(`❌ Company "${companyName}" not found in test set.`);
  console.error(`\nAvailable companies:`);
  allCompanies.forEach(c => console.error(`  - ${c.name} (${c.tier})`));
  process.exit(1);
}

const cutoffDate = company.known_price_point.date;
const knownValue = company.known_price_point.valuation_billions;

console.log(`\n📊 BENCHMARK VALUATION: ${company.name}`);
console.log(`━`.repeat(80));
console.log(`\n  Tier: ${company.tier}`);
console.log(`  Sector: ${company.sector}`);
console.log(`  Known price point: $${knownValue}B (${cutoffDate})`);
console.log(`  Evidence cutoff: Before ${cutoffDate}`);
console.log(`\n━`.repeat(80));

// First, get company ID from Lumen
console.log(`\n⏳ Looking up company in Lumen...`);

const companiesRes = await fetch(`${SITE_URL}/api/lumen/companies`);
const companiesData = await companiesRes.json();
const lumenCompany = companiesData.companies?.find(c =>
  c.name.toLowerCase().includes(company.name.toLowerCase()) ||
  company.name.toLowerCase().includes(c.name.toLowerCase())
);

if (!lumenCompany) {
  console.error(`\n❌ Company not found in Lumen database.`);
  console.error(`   Add "${company.name}" to Lumen first, then run this script.`);
  process.exit(1);
}

console.log(`✅ Found: ${lumenCompany.name} (ID: ${lumenCompany.id})`);

// Run valuation with asOf filter
console.log(`\n⏳ Running valuation (filtering to evidence before ${cutoffDate})...`);

const valuationRes = await fetch(`${SITE_URL}/api/lumen/companies/${lumenCompany.id}/valuation`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ asOf: cutoffDate })
});

if (!valuationRes.ok) {
  const error = await valuationRes.json();
  console.error(`\n❌ Valuation failed: ${error.error || 'Unknown error'}`);
  process.exit(1);
}

const { valuation } = await valuationRes.json();

console.log(`\n✅ Valuation complete!`);
console.log(`\n━`.repeat(80));
console.log(`\n  Base Case: $${valuation.base_case}B`);
console.log(`  Bear Case: $${valuation.bear_case}B`);
console.log(`  Bull Case: $${valuation.bull_case}B`);
console.log(`  Confidence: ${valuation.confidence_score}/100`);

// Calculate error
const error = Math.abs(valuation.base_case - knownValue);
const errorPct = (error / knownValue * 100).toFixed(1);

console.log(`\n  Known actual: $${knownValue}B`);
console.log(`  Error: ${errorPct}% (${valuation.base_case > knownValue ? 'overestimate' : 'underestimate'})`);

const threshold = company.tier === 'famous' ? 30 : 40;
const status = parseFloat(errorPct) <= threshold ? '✅ PASS' : '❌ FAIL';
console.log(`  Status: ${status} (threshold: ${threshold}%)`);

console.log(`\n━`.repeat(80));
console.log(`\n  Key Drivers:`);
valuation.key_drivers?.forEach(d => {
  console.log(`    ${d.impact === '+' ? '📈' : '📉'} ${d.label}: ${d.note}`);
});

console.log(`\n  Explanation:`);
console.log(`    ${valuation.explanation}`);

// Update test file if requested
if (shouldUpdate) {
  console.log(`\n━`.repeat(80));
  console.log(`\n⏳ Updating test-companies.json...`);

  company.lumen_estimate = {
    valuation_billions: valuation.base_case,
    confidence_score: valuation.confidence_score,
    evidence_count: null, // TODO: Could fetch from evidence API
    run_date: new Date().toISOString().split('T')[0],
    notes: `Filtered to evidence before ${cutoffDate}`
  };

  writeFileSync('test-companies.json', JSON.stringify(testData, null, 2));
  console.log(`✅ Updated ${company.name} estimate in test-companies.json`);
}

console.log(`\n━`.repeat(80));
console.log(`\nNext steps:`);
if (!shouldUpdate) {
  console.log(`  - Run with --update to save this estimate to test-companies.json`);
}
console.log(`  - Run valuations for remaining companies`);
console.log(`  - Then run: node score-benchmark.mjs test-companies.json`);
console.log();
