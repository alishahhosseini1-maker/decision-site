#!/usr/bin/env node

/**
 * Seed the ticker bar with 30 high-value private companies
 *
 * Run from project root:
 *   node scripts/seed-ticker-companies.mjs
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

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

// Load seed data
const seedData = JSON.parse(readFileSync('data/ticker-companies-seed.json', 'utf-8'));

console.log(`Seeding ${seedData.length} ticker companies...\n`);

let inserted = 0;
let skipped = 0;

for (const company of seedData) {
  const slug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Check if company already exists
  const { data: existing } = await supabase
    .from('lumen_companies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    console.log(`⊘ ${company.name} (${company.symbol}) - already exists`);
    skipped++;
    continue;
  }

  // Insert new company
  const { error } = await supabase
    .from('lumen_companies')
    .insert({
      slug,
      name: company.name,
      symbol: company.symbol,
      sector: company.sector,
      // Use estimated_value as last_round_value (placeholder until researched)
      last_round_value: company.estimated_value,
      last_round_date: null,
      last_round_confirmed: false,
      // Will be refreshed by cron job
      last_researched_at: null,
      last_valuation_at: null,
      created_by: 'ticker_seed',
    });

  if (error) {
    console.error(`✗ ${company.name} - Error:`, error.message);
  } else {
    console.log(`✓ ${company.name} (${company.symbol}) - $${company.estimated_value}B`);
    inserted++;
  }
}

console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
console.log('\nNext steps:');
console.log('1. Deploy to trigger first cron run (or wait for daily schedule)');
console.log('2. New companies will be researched within 3-4 days via cron rotation');
console.log('3. Users can click ticker items to view detail pages');
