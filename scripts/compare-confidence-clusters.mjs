#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Load .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeCompany(name) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('*')
    .ilike('name', `%${name}%`)
    .single();

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id);

  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('confidence_score, key_drivers')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  // Calculate evidence stats
  const byCategory = {};
  const byStatus = {};
  const bySourceType = {};
  let withDates = 0;
  let withValues = 0;

  evidence?.forEach(e => {
    // By category
    if (!byCategory[e.category]) byCategory[e.category] = 0;
    byCategory[e.category]++;

    // By status
    if (!byStatus[e.status]) byStatus[e.status] = 0;
    byStatus[e.status]++;

    // By source type
    if (!bySourceType[e.source_type]) bySourceType[e.source_type] = 0;
    bySourceType[e.source_type]++;

    if (e.date) withDates++;
    if (e.value !== null) withValues++;
  });

  // Find most recent evidence date
  const dates = evidence?.filter(e => e.date).map(e => e.date).sort().reverse() || [];
  const mostRecent = dates[0] || 'none';
  const oldest = dates[dates.length - 1] || 'none';

  // Calculate staleness (months since most recent evidence)
  let staleness = null;
  if (mostRecent !== 'none') {
    const now = new Date();
    const then = new Date(mostRecent);
    staleness = Math.floor((now - then) / (1000 * 60 * 60 * 24 * 30));
  }

  return {
    name: company.name,
    confidence: valuation.confidence_score,
    totalEvidence: evidence?.length || 0,
    byCategory,
    byStatus,
    bySourceType,
    withDates,
    withValues,
    mostRecent,
    oldest,
    staleness,
    keyDrivers: valuation.key_drivers,
  };
}

console.log('='.repeat(80));
console.log('CONFIDENCE CLUSTER ANALYSIS');
console.log('='.repeat(80));

console.log('\n42-CLUSTER: Stripe vs Ramp\n');

const stripe = await analyzeCompany('Stripe');
const ramp = await analyzeCompany('Ramp');

console.log(`${stripe.name} (${stripe.confidence}/100):`);
console.log(`  Total evidence: ${stripe.totalEvidence}`);
console.log(`  By category: ${JSON.stringify(stripe.byCategory)}`);
console.log(`  By status: ${JSON.stringify(stripe.byStatus)}`);
console.log(`  By source: ${JSON.stringify(stripe.bySourceType)}`);
console.log(`  With dates: ${stripe.withDates}/${stripe.totalEvidence}`);
console.log(`  With values: ${stripe.withValues}/${stripe.totalEvidence}`);
console.log(`  Most recent: ${stripe.mostRecent} (${stripe.staleness} months ago)`);
console.log(`  Oldest: ${stripe.oldest}`);
console.log();

console.log(`${ramp.name} (${ramp.confidence}/100):`);
console.log(`  Total evidence: ${ramp.totalEvidence}`);
console.log(`  By category: ${JSON.stringify(ramp.byCategory)}`);
console.log(`  By status: ${JSON.stringify(ramp.byStatus)}`);
console.log(`  By source: ${JSON.stringify(ramp.bySourceType)}`);
console.log(`  With dates: ${ramp.withDates}/${ramp.totalEvidence}`);
console.log(`  With values: ${ramp.withValues}/${ramp.totalEvidence}`);
console.log(`  Most recent: ${ramp.mostRecent} (${ramp.staleness} months ago)`);
console.log(`  Oldest: ${ramp.oldest}`);
console.log();

console.log('Comparison:');
console.log(`  Evidence count diff: ${Math.abs(stripe.totalEvidence - ramp.totalEvidence)}`);
console.log(`  Staleness diff: ${Math.abs(stripe.staleness - ramp.staleness)} months`);
console.log(`  Status match: ${JSON.stringify(stripe.byStatus) === JSON.stringify(ramp.byStatus)}`);
console.log();

console.log('Key drivers - Stripe:');
if (Array.isArray(stripe.keyDrivers)) {
  stripe.keyDrivers.forEach(d => console.log(`  ${d.impact} ${d.label}`));
} else {
  console.log('  (Not array format)');
}

console.log('\nKey drivers - Ramp:');
if (Array.isArray(ramp.keyDrivers)) {
  ramp.keyDrivers.forEach(d => console.log(`  ${d.impact} ${d.label}`));
} else {
  console.log('  (Not array format)');
}

console.log('\n' + '='.repeat(80));
console.log('72-CLUSTER: Anduril vs SpaceX\n');

const anduril = await analyzeCompany('Anduril');
const spacex = await analyzeCompany('SpaceX');

console.log(`${anduril.name} (${anduril.confidence}/100):`);
console.log(`  Total evidence: ${anduril.totalEvidence}`);
console.log(`  By category: ${JSON.stringify(anduril.byCategory)}`);
console.log(`  By status: ${JSON.stringify(anduril.byStatus)}`);
console.log(`  By source: ${JSON.stringify(anduril.bySourceType)}`);
console.log(`  With dates: ${anduril.withDates}/${anduril.totalEvidence}`);
console.log(`  With values: ${anduril.withValues}/${anduril.totalEvidence}`);
console.log(`  Most recent: ${anduril.mostRecent} (${anduril.staleness} months ago)`);
console.log(`  Oldest: ${anduril.oldest}`);
console.log();

console.log(`${spacex.name} (${spacex.confidence}/100):`);
console.log(`  Total evidence: ${spacex.totalEvidence}`);
console.log(`  By category: ${JSON.stringify(spacex.byCategory)}`);
console.log(`  By status: ${JSON.stringify(spacex.byStatus)}`);
console.log(`  By source: ${JSON.stringify(spacex.bySourceType)}`);
console.log(`  With dates: ${spacex.withDates}/${spacex.totalEvidence}`);
console.log(`  With values: ${spacex.withValues}/${spacex.totalEvidence}`);
console.log(`  Most recent: ${spacex.mostRecent} (${spacex.staleness} months ago)`);
console.log(`  Oldest: ${spacex.oldest}`);
console.log();

console.log('Comparison:');
console.log(`  Evidence count diff: ${Math.abs(anduril.totalEvidence - spacex.totalEvidence)}`);
console.log(`  Staleness diff: ${Math.abs(anduril.staleness - spacex.staleness)} months`);
console.log(`  Status match: ${JSON.stringify(anduril.byStatus) === JSON.stringify(spacex.byStatus)}`);
console.log();

console.log('Key drivers - Anduril:');
if (Array.isArray(anduril.keyDrivers)) {
  anduril.keyDrivers.forEach(d => console.log(`  ${d.impact} ${d.label}`));
} else {
  console.log('  (Not array format)');
}

console.log('\nKey drivers - SpaceX:');
if (Array.isArray(spacex.keyDrivers)) {
  spacex.keyDrivers.forEach(d => console.log(`  ${d.impact} ${d.label}`));
} else {
  console.log('  (Not array format)');
}

console.log('\n' + '='.repeat(80));
console.log('VERDICT');
console.log('='.repeat(80));

// Check if patterns are similar
const cluster42Similar = (
  Math.abs(stripe.totalEvidence - ramp.totalEvidence) <= 3 &&
  Math.abs(stripe.staleness - ramp.staleness) <= 12
);

const cluster72Similar = (
  Math.abs(anduril.totalEvidence - spacex.totalEvidence) <= 5 &&
  Math.abs(anduril.staleness - spacex.staleness) <= 6
);

if (cluster42Similar && cluster72Similar) {
  console.log('✅ Evidence patterns are SIMILAR within clusters');
  console.log('   Identical scores reflect coarse-grained bucketing of similar evidence shapes');
  console.log('   Expected behavior - confidence scoring working correctly');
} else {
  console.log('❌ Evidence patterns are DIFFERENT within clusters');
  console.log('   Identical scores despite different evidence suggests potential bug');
  console.log('   Confidence calculation may not be reading actual evidence correctly');
}
