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

// Get all companies with their latest valuations
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name, slug');

const scores = [];

for (const company of companies || []) {
  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('confidence_score')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  if (valuation) {
    scores.push({ name: company.name, confidence: valuation.confidence_score });
  }
}

// Sort by confidence
scores.sort((a, b) => a.confidence - b.confidence);

console.log('CONFIDENCE SCORE DISTRIBUTION');
console.log('='.repeat(80));
console.log(`Total companies with valuations: ${scores.length}\n`);

// Stats
const confidences = scores.map(s => s.confidence);
const min = Math.min(...confidences);
const max = Math.max(...confidences);
const mean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
const median = confidences[Math.floor(confidences.length / 2)];

console.log('Statistics:');
console.log(`  Min: ${min}`);
console.log(`  Max: ${max}`);
console.log(`  Mean: ${mean.toFixed(1)}`);
console.log(`  Median: ${median}`);
console.log();

// Distribution by tier
const veryLow = scores.filter(s => s.confidence < 40);
const low = scores.filter(s => s.confidence >= 40 && s.confidence < 60);
const medium = scores.filter(s => s.confidence >= 60 && s.confidence < 80);
const high = scores.filter(s => s.confidence >= 80);

console.log('Distribution by tier:');
console.log(`  Very Low (<40):  ${veryLow.length.toString().padStart(2)} companies (${(veryLow.length/scores.length*100).toFixed(1)}%)`);
console.log(`  Low (40-59):     ${low.length.toString().padStart(2)} companies (${(low.length/scores.length*100).toFixed(1)}%)`);
console.log(`  Medium (60-79):  ${medium.length.toString().padStart(2)} companies (${(medium.length/scores.length*100).toFixed(1)}%)`);
console.log(`  High (80+):      ${high.length.toString().padStart(2)} companies (${(high.length/scores.length*100).toFixed(1)}%)`);
console.log();

// Histogram (10-point buckets)
console.log('Histogram (10-point buckets):');
for (let i = 0; i <= 90; i += 10) {
  const count = scores.filter(s => s.confidence >= i && s.confidence < i + 10).length;
  const bar = '█'.repeat(count);
  console.log(`  ${i.toString().padStart(2)}-${(i+9).toString().padStart(2)}: ${count.toString().padStart(2)} ${bar}`);
}
console.log();

// Show each tier
console.log('='.repeat(80));
console.log('VERY LOW CONFIDENCE (<40):');
veryLow.forEach(s => console.log(`  ${s.confidence.toString().padStart(2)}: ${s.name}`));

console.log('\nLOW CONFIDENCE (40-59):');
low.forEach(s => console.log(`  ${s.confidence.toString().padStart(2)}: ${s.name}`));

console.log('\nMEDIUM CONFIDENCE (60-79):');
medium.forEach(s => console.log(`  ${s.confidence.toString().padStart(2)}: ${s.name}`));

console.log('\nHIGH CONFIDENCE (80+):');
high.forEach(s => console.log(`  ${s.confidence.toString().padStart(2)}: ${s.name}`));
