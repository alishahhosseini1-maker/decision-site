#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Source type confidence map (from lumen.ts)
const CONFIDENCE_MAP = {
  'Verified Filings': 95,
  'Company Announcement': 90,
  'Reputable Publication': 85,
  'Industry Research': 75,
  'Social Media': 60,
  'Unattributed': 40,
};

const MOMENTUM_CATEGORIES = ['Revenue', 'Headcount', 'Product', 'Contracts', 'Metrics'];

function calculateConfidenceScore(evidence, mostRecentFundingDate) {
  let score = 100;
  const details = [];

  // 1. Staleness penalty (proportional)
  if (mostRecentFundingDate) {
    const now = new Date();
    const then = new Date(mostRecentFundingDate);
    const monthsStale = Math.floor((now - then) / (1000 * 60 * 60 * 24 * 30));
    const stalenessPenalty = Math.min(50, monthsStale * 0.5);
    score -= stalenessPenalty;
    details.push(`Staleness: -${stalenessPenalty.toFixed(1)} (${monthsStale}mo old)`);
  }

  // 2. Verification penalty (proportional)
  const unverified = evidence.filter(e => e.status !== 'verified').length;
  const unverifiedPct = evidence.length > 0 ? unverified / evidence.length : 0;
  const verificationPenalty = unverifiedPct * 30;
  score -= verificationPenalty;
  details.push(`Verification: -${verificationPenalty.toFixed(1)} (${(unverifiedPct * 100).toFixed(0)}% unverified)`);

  // 3. Momentum penalty (binary)
  const hasMomentum = evidence.some(e => MOMENTUM_CATEGORIES.includes(e.category));
  if (!hasMomentum) {
    score -= 15;
    details.push(`Momentum: -15 (no momentum evidence)`);
  } else {
    details.push(`Momentum: 0 (has momentum evidence)`);
  }

  // 4. Source credibility adjustment
  if (evidence.length > 0) {
    const avgSourceConf = evidence.reduce((sum, e) => sum + (CONFIDENCE_MAP[e.source_type] || 50), 0) / evidence.length;
    const credibilityAdj = (avgSourceConf - 75) * 0.2; // Center at 75 (Industry Research baseline)
    score += credibilityAdj;
    details.push(`Source quality: ${credibilityAdj >= 0 ? '+' : ''}${credibilityAdj.toFixed(1)} (avg ${avgSourceConf.toFixed(0)})`);
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return { score: finalScore, details };
}

async function analyzeAll() {
  const { data: companies } = await supabase
    .from('lumen_companies')
    .select('id, name, slug');

  const results = [];

  for (const company of companies || []) {
    const { data: evidence } = await supabase
      .from('lumen_evidence')
      .select('*')
      .eq('company_id', company.id);

    const { data: valuation } = await supabase
      .from('lumen_valuations')
      .select('confidence_score')
      .eq('company_id', company.id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (!evidence || evidence.length === 0 || !valuation) continue;

    // Find most recent funding
    const funding = evidence.filter(e => e.category === 'Funding' && e.date);
    const mostRecent = funding.length > 0
      ? funding.reduce((latest, e) => (e.date > latest.date ? e : latest)).date
      : null;

    const { score: newScore, details } = calculateConfidenceScore(evidence, mostRecent);

    results.push({
      name: company.name,
      oldScore: valuation.confidence_score,
      newScore,
      diff: newScore - valuation.confidence_score,
      details,
      evidenceCount: evidence.length,
    });
  }

  return results;
}

const results = await analyzeAll();

// Sort by new score
results.sort((a, b) => a.newScore - b.newScore);

console.log('='.repeat(100));
console.log('FORMULAIC CONFIDENCE SCORE TEST - ALL 26 COMPANIES');
console.log('='.repeat(100));
console.log();

results.forEach((r, i) => {
  const diffStr = r.diff >= 0 ? `+${r.diff}` : `${r.diff}`;
  const arrow = r.diff > 5 ? '↑' : r.diff < -5 ? '↓' : '→';
  console.log(`${(i + 1).toString().padStart(2)}. ${r.name.padEnd(25)} New: ${r.newScore.toString().padStart(2)}  Old: ${r.oldScore.toString().padStart(2)}  ${arrow} ${diffStr.padStart(4)}`);
  r.details.forEach(d => console.log(`    ${d}`));
  console.log();
});

console.log('='.repeat(100));
console.log('STATISTICS');
console.log('='.repeat(100));

const newScores = results.map(r => r.newScore);
const oldScores = results.map(r => r.oldScore);

console.log('\nNew scores:');
console.log(`  Min: ${Math.min(...newScores)}`);
console.log(`  Max: ${Math.max(...newScores)}`);
console.log(`  Mean: ${(newScores.reduce((a, b) => a + b, 0) / newScores.length).toFixed(1)}`);
console.log(`  Median: ${newScores[Math.floor(newScores.length / 2)]}`);

console.log('\nOld scores:');
console.log(`  Min: ${Math.min(...oldScores)}`);
console.log(`  Max: ${Math.max(...oldScores)}`);
console.log(`  Mean: ${(oldScores.reduce((a, b) => a + b, 0) / oldScores.length).toFixed(1)}`);
console.log(`  Median: ${oldScores[Math.floor(oldScores.length / 2)]}`);

console.log('\nClamping check:');
const clampedAt0 = newScores.filter(s => s === 0).length;
const clampedAt100 = newScores.filter(s => s === 100).length;
console.log(`  Scores at 0: ${clampedAt0} ${clampedAt0 > 0 ? '⚠️  MISCALIBRATED' : '✓'}`);
console.log(`  Scores at 100: ${clampedAt100} ${clampedAt100 > 0 ? '⚠️  MISCALIBRATED' : '✓'}`);

console.log('\n='.repeat(100));
console.log('NEW TIER DISTRIBUTION');
console.log('='.repeat(100));

// Test different boundary sets
const boundarySets = [
  { name: 'Original (80/60/40)', high: 80, med: 60, low: 40 },
  { name: 'Option A (75/55/35)', high: 75, med: 55, low: 35 },
  { name: 'Option B (70/50/30)', high: 70, med: 50, low: 30 },
];

boundarySets.forEach(boundaries => {
  const veryLow = newScores.filter(s => s < boundaries.low);
  const low = newScores.filter(s => s >= boundaries.low && s < boundaries.med);
  const med = newScores.filter(s => s >= boundaries.med && s < boundaries.high);
  const high = newScores.filter(s => s >= boundaries.high);

  console.log(`\n${boundaries.name}:`);
  console.log(`  Very Low (<${boundaries.low}):  ${veryLow.length.toString().padStart(2)} companies (${(veryLow.length / newScores.length * 100).toFixed(1)}%)`);
  console.log(`  Low (${boundaries.low}-${boundaries.med - 1}):      ${low.length.toString().padStart(2)} companies (${(low.length / newScores.length * 100).toFixed(1)}%)`);
  console.log(`  Medium (${boundaries.med}-${boundaries.high - 1}):   ${med.length.toString().padStart(2)} companies (${(med.length / newScores.length * 100).toFixed(1)}%)`);
  console.log(`  High (${boundaries.high}+):       ${high.length.toString().padStart(2)} companies (${(high.length / newScores.length * 100).toFixed(1)}%)`);
});

console.log('\n='.repeat(100));
console.log('HISTOGRAM (new scores, 10-point buckets)');
console.log('='.repeat(100));

for (let i = 0; i <= 90; i += 10) {
  const count = newScores.filter(s => s >= i && s < i + 10).length;
  const bar = '█'.repeat(count);
  console.log(`  ${i.toString().padStart(2)}-${(i + 9).toString().padStart(2)}: ${count.toString().padStart(2)} ${bar}`);
}
