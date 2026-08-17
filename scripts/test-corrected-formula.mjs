#!/usr/bin/env node

console.log('CORRECTED FORMULA TEST (with absolute staleness factor)');
console.log('='.repeat(80));
console.log();

// Anthropic data
const primary = { value: 965, date: '2026-05-28' };
const secondary = { value: 1200, date: '2026-07-09' };
const referenceDate = new Date('2026-08-17');

// Calculate months since
const monthsSincePrimary = (referenceDate - new Date(primary.date)) / (1000 * 60 * 60 * 24 * 30);
const monthsSinceSecondary = (referenceDate - new Date(secondary.date)) / (1000 * 60 * 60 * 24 * 30);

console.log('ANTHROPIC');
console.log('-'.repeat(80));
console.log(`Primary: $${primary.value}B (${primary.date}, ${monthsSincePrimary.toFixed(1)}mo old)`);
console.log(`Secondary: $${secondary.value}B (${secondary.date}, ${monthsSinceSecondary.toFixed(1)}mo old)`);
console.log();

// OLD FORMULA (flawed)
console.log('OLD FORMULA (relative staleness only):');
const relativeWeight = monthsSincePrimary / (monthsSincePrimary + monthsSinceSecondary + 1);
console.log(`  Relative weight: ${relativeWeight.toFixed(3)}`);
console.log(`  After credibility (×1.435): ${(relativeWeight * 1.435).toFixed(3)} → capped at 0.700`);
console.log(`  Result: 70% secondary weight (too high for fresh primary)`);
console.log();

// NEW FORMULA (with absolute staleness factor)
console.log('NEW FORMULA (relative × absolute):');
const absoluteFactor = Math.min(1.0, monthsSincePrimary / 20);
const stalnessWeight = relativeWeight * absoluteFactor;
console.log(`  Relative weight: ${relativeWeight.toFixed(3)}`);
console.log(`  Absolute factor: min(1.0, ${monthsSincePrimary.toFixed(1)}/20) = ${absoluteFactor.toFixed(3)}`);
console.log(`  Staleness weight: ${relativeWeight.toFixed(3)} × ${absoluteFactor.toFixed(3)} = ${stalnessWeight.toFixed(3)}`);
console.log(`  After credibility (×1.435): ${(stalnessWeight * 1.435).toFixed(3)}`);
console.log(`  Bounded (10%-70%): ${Math.max(0.10, Math.min(0.70, stalnessWeight * 1.435)).toFixed(3)}`);
console.log();

// Calculate base cases
const illiquidityDiscount = 0.15;
const adjustedSecondary = secondary.value * (1 - illiquidityDiscount);

const oldWeight = 0.700;
const newWeight = Math.max(0.10, Math.min(0.70, stalnessWeight * 1.435));

const oldBase = Math.round((1 - oldWeight) * primary.value + oldWeight * adjustedSecondary);
const newBase = Math.round((1 - newWeight) * primary.value + newWeight * adjustedSecondary);

console.log('BASE CASE COMPARISON:');
console.log(`  Old formula: (1-0.700)×$${primary.value}B + 0.700×$${adjustedSecondary}B = $${oldBase}B`);
console.log(`  New formula: (1-${newWeight.toFixed(3)})×$${primary.value}B + ${newWeight.toFixed(3)}×$${adjustedSecondary}B = $${newBase}B`);
console.log(`  Current AI:  $1050B`);
console.log();
console.log(`  Old vs AI: ${oldBase - 1050}B`);
console.log(`  New vs AI: ${newBase - 1050}B`);
console.log();

console.log('='.repeat(80));
console.log('ASSESSMENT:');
console.log(`  New formula gives ${(newWeight * 100).toFixed(1)}% secondary weight (was 70%)`);
console.log(`  With both evidence types fresh, lower weight is more defensible`);
console.log(`  Result: $${newBase}B (closer to primary anchor as expected)`);
