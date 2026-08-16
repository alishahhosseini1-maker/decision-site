#!/usr/bin/env node

/**
 * Accuracy Benchmark Scorer
 *
 * Usage: node score-benchmark.mjs test-companies.json
 *
 * Analyzes Lumen AI valuation accuracy against known price points.
 */

import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync(process.argv[2] || 'test-companies.json', 'utf8'));

// Filter out incomplete test cases
const completed = data.companies.filter(c =>
  c.known_price_point?.valuation_billions &&
  c.lumen_estimate?.valuation_billions
);

if (completed.length === 0) {
  console.log('❌ No completed test cases found. Fill in test-companies.json first.');
  process.exit(1);
}

console.log(`\n📊 LUMEN ACCURACY BENCHMARK\n`);
console.log(`Completed: ${completed.length}/${data.companies.length} companies\n`);
console.log('='.repeat(80));

// Calculate errors
const results = completed.map(c => {
  const known = c.known_price_point.valuation_billions;
  const estimated = c.lumen_estimate.valuation_billions;
  const errorAbs = Math.abs(estimated - known);
  const errorPct = (errorAbs / known) * 100;

  return {
    name: c.name,
    sector: c.sector,
    stage: c.stage,
    known,
    estimated,
    errorAbs,
    errorPct,
    evidenceCount: c.lumen_estimate.evidence_count || 0,
    evidenceCredibility: c.lumen_estimate.evidence_avg_credibility || 0,
    confidenceScore: c.lumen_estimate.confidence_score || 0
  };
});

// Overall stats
const errors = results.map(r => r.errorPct);
const medianError = errors.sort((a, b) => a - b)[Math.floor(errors.length / 2)];
const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
const maxError = Math.max(...errors);
const minError = Math.min(...errors);

console.log(`\n📈 OVERALL ACCURACY\n`);
console.log(`  Median error: ${medianError.toFixed(1)}%`);
console.log(`  Mean error: ${meanError.toFixed(1)}%`);
console.log(`  Range: ${minError.toFixed(1)}% - ${maxError.toFixed(1)}%`);

// Error distribution
const under10 = errors.filter(e => e < 10).length;
const under25 = errors.filter(e => e < 25).length;
const under50 = errors.filter(e => e < 50).length;

console.log(`\n📊 ERROR DISTRIBUTION\n`);
console.log(`  < 10% error: ${under10}/${completed.length} (${(under10/completed.length*100).toFixed(0)}%)`);
console.log(`  < 25% error: ${under25}/${completed.length} (${(under25/completed.length*100).toFixed(0)}%)`);
console.log(`  < 50% error: ${under50}/${completed.length} (${(under50/completed.length*100).toFixed(0)}%)`);

// Segment by sector
console.log(`\n🏢 BY SECTOR\n`);
const bySector = {};
results.forEach(r => {
  if (!bySector[r.sector]) bySector[r.sector] = [];
  bySector[r.sector].push(r.errorPct);
});

Object.entries(bySector).forEach(([sector, errs]) => {
  const median = errs.sort((a, b) => a - b)[Math.floor(errs.length / 2)];
  console.log(`  ${sector}: ${median.toFixed(1)}% median (n=${errs.length})`);
});

// Segment by stage
console.log(`\n📍 BY STAGE\n`);
const byStage = {};
results.forEach(r => {
  if (!byStage[r.stage]) byStage[r.stage] = [];
  byStage[r.stage].push(r.errorPct);
});

Object.entries(byStage).forEach(([stage, errs]) => {
  const median = errs.sort((a, b) => a - b)[Math.floor(errs.length / 2)];
  console.log(`  ${stage}: ${median.toFixed(1)}% median (n=${errs.length})`);
});

// Correlation with evidence count
console.log(`\n📚 EVIDENCE COUNT vs ERROR\n`);
const lowEvidence = results.filter(r => r.evidenceCount < 5);
const highEvidence = results.filter(r => r.evidenceCount >= 5);

if (lowEvidence.length > 0) {
  const lowMedian = lowEvidence.map(r => r.errorPct).sort((a,b)=>a-b)[Math.floor(lowEvidence.length/2)];
  console.log(`  < 5 evidence items: ${lowMedian.toFixed(1)}% median error (n=${lowEvidence.length})`);
}

if (highEvidence.length > 0) {
  const highMedian = highEvidence.map(r => r.errorPct).sort((a,b)=>a-b)[Math.floor(highEvidence.length/2)];
  console.log(`  ≥ 5 evidence items: ${highMedian.toFixed(1)}% median error (n=${highEvidence.length})`);
}

// Worst performers
console.log(`\n❌ WORST 5 ESTIMATES\n`);
const worst = [...results].sort((a, b) => b.errorPct - a.errorPct).slice(0, 5);
worst.forEach((r, i) => {
  console.log(`  ${i+1}. ${r.name} (${r.sector}, ${r.stage})`);
  console.log(`     Known: $${r.known}B | Estimated: $${r.estimated}B | Error: ${r.errorPct.toFixed(1)}%`);
  console.log(`     Evidence: ${r.evidenceCount} items | Credibility: ${r.evidenceCredibility}`);
});

// Best performers
console.log(`\n✅ BEST 5 ESTIMATES\n`);
const best = [...results].sort((a, b) => a.errorPct - b.errorPct).slice(0, 5);
best.forEach((r, i) => {
  console.log(`  ${i+1}. ${r.name} (${r.sector}, ${r.stage})`);
  console.log(`     Known: $${r.known}B | Estimated: $${r.estimated}B | Error: ${r.errorPct.toFixed(1)}%`);
  console.log(`     Evidence: ${r.evidenceCount} items | Credibility: ${r.evidenceCredibility}`);
});

// Pattern detection
console.log(`\n🔍 PATTERN ANALYSIS\n`);

// Systematic bias check
const overestimates = results.filter(r => r.estimated > r.known).length;
const underestimates = results.filter(r => r.estimated < r.known).length;

console.log(`  Overestimates: ${overestimates}/${completed.length} (${(overestimates/completed.length*100).toFixed(0)}%)`);
console.log(`  Underestimates: ${underestimates}/${completed.length} (${(underestimates/completed.length*100).toFixed(0)}%)`);

if (overestimates > underestimates * 1.5) {
  console.log(`  ⚠️  SYSTEMATIC OVERESTIMATION BIAS DETECTED`);
} else if (underestimates > overestimates * 1.5) {
  console.log(`  ⚠️  SYSTEMATIC UNDERESTIMATION BIAS DETECTED`);
} else {
  console.log(`  ✅ No obvious systematic bias`);
}

console.log(`\n` + '='.repeat(80));
console.log(`\n📝 RECOMMENDATIONS\n`);

// Generate recommendations based on patterns
if (meanError > 50) {
  console.log(`  🔴 CRITICAL: Mean error >50%. Core valuation logic needs fundamental revision.`);
} else if (meanError > 25) {
  console.log(`  ⚠️  Mean error >25%. Valuation useful for directional estimates only.`);
} else if (meanError > 10) {
  console.log(`  ✅ Mean error 10-25%. Reasonable accuracy for unaudited crowdsourced data.`);
} else {
  console.log(`  🎯 Mean error <10%. Competitive with professional valuation tools.`);
}

// Specific recommendations
const recommendations = [];

if (lowEvidence.length > 0 && highEvidence.length > 0) {
  const lowMed = lowEvidence.map(r=>r.errorPct).sort((a,b)=>a-b)[Math.floor(lowEvidence.length/2)];
  const highMed = highEvidence.map(r=>r.errorPct).sort((a,b)=>a-b)[Math.floor(highEvidence.length/2)];

  if (lowMed > highMed * 1.5) {
    recommendations.push(`Evidence density matters: ${lowMed.toFixed(0)}% error with <5 items vs ${highMed.toFixed(0)}% with ≥5. Flag low-evidence estimates as "preliminary."`);
  }
}

if (Object.keys(byStage).length > 1) {
  const stageErrors = Object.entries(byStage).map(([stage, errs]) => ({
    stage,
    median: errs.sort((a,b)=>a-b)[Math.floor(errs.length/2)]
  }));

  const worst = stageErrors.sort((a,b)=>b.median-a.median)[0];
  if (worst.median > meanError * 1.5) {
    recommendations.push(`${worst.stage} has ${worst.median.toFixed(0)}% median error (vs ${meanError.toFixed(0)}% overall). Investigate why this stage underperforms.`);
  }
}

if (recommendations.length > 0) {
  console.log();
  recommendations.forEach(r => console.log(`  • ${r}`));
}

console.log(`\n` + '='.repeat(80) + `\n`);
