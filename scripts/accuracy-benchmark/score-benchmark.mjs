#!/usr/bin/env node

/**
 * Accuracy Benchmark Scorer - 2-Tier Version
 *
 * Usage: node score-benchmark.mjs test-companies.json
 *
 * Scores Tier 1 (famous) and Tier 2 (less-famous) separately.
 * Tier 2 is the real validation signal.
 */

import { readFileSync } from 'fs';

const data = JSON.parse(readFileSync(process.argv[2] || 'test-companies.json', 'utf8'));

// Extract companies from both tiers
const tier1Companies = data.tiers?.tier1_famous?.companies || [];
const tier2Companies = data.tiers?.tier2_less_famous?.companies || [];
const allCompanies = [...tier1Companies, ...tier2Companies];

// Filter completed test cases
const tier1Completed = tier1Companies.filter(c =>
  c.known_price_point?.valuation_billions &&
  c.lumen_estimate?.valuation_billions
);

const tier2Completed = tier2Companies.filter(c =>
  c.known_price_point?.valuation_billions &&
  c.lumen_estimate?.valuation_billions
);

if (tier1Completed.length === 0 && tier2Completed.length === 0) {
  console.log('❌ No completed test cases found. Run valuations first.');
  process.exit(1);
}

console.log(`\n📊 LUMEN 2-TIER ACCURACY BENCHMARK\n`);
console.log('='.repeat(80));

// Calculate errors for a set of companies
function calculateResults(companies) {
  return companies.map(c => {
    const known = c.known_price_point.valuation_billions;
    const estimated = c.lumen_estimate.valuation_billions;
    const errorAbs = Math.abs(estimated - known);
    const errorPct = (errorAbs / known) * 100;

    return {
      name: c.name,
      sector: c.sector,
      stage: c.stage,
      tier: c.tier,
      known,
      estimated,
      errorAbs,
      errorPct,
      evidenceCount: c.lumen_estimate.evidence_count || 0,
      confidenceScore: c.lumen_estimate.confidence_score || 0
    };
  });
}

// Score a tier
function scoreTier(results, tierName, threshold) {
  if (results.length === 0) {
    console.log(`\n⚠️  ${tierName}: No completed tests\n`);
    return null;
  }

  const errors = results.map(r => r.errorPct);
  const medianError = errors.sort((a, b) => a - b)[Math.floor(errors.length / 2)];
  const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;
  const maxError = Math.max(...errors);
  const minError = Math.min(...errors);

  console.log(`\n${'━'.repeat(80)}`);
  console.log(`\n${tierName.toUpperCase()}\n`);

  console.log(`  Completed: ${results.length} companies`);
  console.log(`  Median error: ${medianError.toFixed(1)}%`);
  console.log(`  Mean error: ${meanError.toFixed(1)}%`);
  console.log(`  Range: ${minError.toFixed(1)}% - ${maxError.toFixed(1)}%`);

  // Threshold check
  const withinThreshold = errors.filter(e => e <= threshold).length;
  const passRate = (withinThreshold / results.length * 100).toFixed(0);

  console.log(`\n  Success threshold: ≤${threshold}% error`);
  console.log(`  Pass rate: ${withinThreshold}/${results.length} (${passRate}%)`);

  // Individual results
  console.log(`\n  Individual Results:`);
  results.forEach(r => {
    const status = r.errorPct <= threshold ? '✅' : '❌';
    console.log(`    ${status} ${r.name}: $${r.known}B actual → $${r.estimated}B estimate (${r.errorPct.toFixed(1)}% error)`);
  });

  // Sector breakdown if multiple sectors
  const bySector = {};
  results.forEach(r => {
    if (!bySector[r.sector]) bySector[r.sector] = [];
    bySector[r.sector].push(r.errorPct);
  });

  if (Object.keys(bySector).length > 1) {
    console.log(`\n  By Sector:`);
    Object.entries(bySector).forEach(([sector, errs]) => {
      const median = errs.sort((a, b) => a - b)[Math.floor(errs.length / 2)];
      console.log(`    ${sector}: ${median.toFixed(1)}% median (n=${errs.length})`);
    });
  }

  // Bias check
  const overestimates = results.filter(r => r.estimated > r.known).length;
  const underestimates = results.filter(r => r.estimated < r.known).length;

  console.log(`\n  Bias Check:`);
  console.log(`    Overestimates: ${overestimates}/${results.length}`);
  console.log(`    Underestimates: ${underestimates}/${results.length}`);

  if (overestimates > underestimates * 1.5) {
    console.log(`    ⚠️  Systematic overestimation bias`);
  } else if (underestimates > overestimates * 1.5) {
    console.log(`    ⚠️  Systematic underestimation bias`);
  } else {
    console.log(`    ✅ No obvious bias`);
  }

  return {
    count: results.length,
    meanError,
    medianError,
    passRate: parseFloat(passRate),
    withinThreshold
  };
}

// Score Tier 1 (Famous)
const tier1Results = calculateResults(tier1Completed);
const tier1Score = scoreTier(
  tier1Results,
  '🌟 TIER 1: FAMOUS COMPANIES',
  data.scoring_framework?.tier1_famous?.success_threshold?.match(/\d+/)?.[0] || 30
);

// Score Tier 2 (Less-famous)
const tier2Results = calculateResults(tier2Completed);
const tier2Score = scoreTier(
  tier2Results,
  '🎯 TIER 2: LESS-FAMOUS COMPANIES (Real Validation Signal)',
  data.scoring_framework?.tier2_less_famous?.success_threshold?.match(/\d+/)?.[0] || 40
);

// Final interpretation
console.log(`\n${'━'.repeat(80)}`);
console.log(`\n📝 INTERPRETATION\n`);

if (tier1Score && tier2Score) {
  console.log(`  Tier 1 (Famous):`);
  if (tier1Score.meanError > 30) {
    console.log(`    🔴 FAIL: ${tier1Score.meanError.toFixed(1)}% mean error. Major pipeline issues.`);
  } else {
    console.log(`    ✅ PASS: ${tier1Score.meanError.toFixed(1)}% mean error. Sanity check passed.`);
    console.log(`    Note: Good Tier 1 score does NOT prove pipeline works (training data risk).`);
  }

  console.log(`\n  Tier 2 (Less-famous) - THE REAL TEST:`);
  if (tier2Score.meanError > 60) {
    console.log(`    🔴 CRITICAL: ${tier2Score.meanError.toFixed(1)}% mean error. Pipeline doesn't work.`);
    console.log(`    Recommendation: Fix core valuation logic before proceeding.`);
  } else if (tier2Score.meanError > 40) {
    console.log(`    ⚠️  MARGINAL: ${tier2Score.meanError.toFixed(1)}% mean error. Needs improvement.`);
    console.log(`    Recommendation: Useful for rough estimates only. Improve evidence gathering.`);
  } else if (tier2Score.meanError > 25) {
    console.log(`    ✅ ACCEPTABLE: ${tier2Score.meanError.toFixed(1)}% mean error. Reasonable for crowdsourced data.`);
    console.log(`    Recommendation: Pipeline validated. Can proceed with wedge strategy.`);
  } else {
    console.log(`    🎯 EXCELLENT: ${tier2Score.meanError.toFixed(1)}% mean error. Competitive accuracy.`);
    console.log(`    Recommendation: Pipeline validated. Strong foundation for GTM.`);
  }

  // Detect uneven accuracy across sectors (Tier 2 only)
  if (tier2Results.length >= 3) {
    const bySector = {};
    tier2Results.forEach(r => {
      if (!bySector[r.sector]) bySector[r.sector] = [];
      bySector[r.sector].push(r.errorPct);
    });

    if (Object.keys(bySector).length > 1) {
      const sectorMedians = Object.entries(bySector).map(([sector, errs]) => ({
        sector,
        median: errs.sort((a,b)=>a-b)[Math.floor(errs.length/2)],
        count: errs.length
      })).sort((a,b) => a.median - b.median);

      const best = sectorMedians[0];
      const worst = sectorMedians[sectorMedians.length - 1];

      if (worst.median > best.median * 1.5 && worst.count >= 2) {
        console.log(`\n  ⚠️  UNEVEN ACCURACY DETECTED:`);
        console.log(`    Best: ${best.sector} (${best.median.toFixed(1)}% median error)`);
        console.log(`    Worst: ${worst.sector} (${worst.median.toFixed(1)}% median error)`);
        console.log(`    Recommendation: Investigate why ${worst.sector} underperforms.`);
      }
    }
  }
} else if (tier1Score) {
  console.log(`  Only Tier 1 completed. Run Tier 2 to get real validation signal.`);
} else if (tier2Score) {
  console.log(`  Tier 2 (Less-famous):`);
  console.log(`    Mean error: ${tier2Score.meanError.toFixed(1)}%`);
  console.log(`    This is the real validation. See interpretation above.`);
}

console.log(`\n${'='.repeat(80)}\n`);

// Export summary for programmatic use
const summary = {
  tier1: tier1Score,
  tier2: tier2Score,
  timestamp: new Date().toISOString()
};

console.log(`Summary: ${JSON.stringify(summary, null, 2)}\n`);
