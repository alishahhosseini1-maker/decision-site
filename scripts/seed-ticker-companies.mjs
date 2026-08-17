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

// Load normalized seed data (with fixed sector taxonomy)
const seedData = JSON.parse(readFileSync('data/ticker-companies-seed-normalized.json', 'utf-8'));

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
  const { data: newCompany, error } = await supabase
    .from('lumen_companies')
    .insert({
      slug,
      name: company.name,
      symbol: company.symbol,
      sector: company.sector,
      secondary_sectors: company.secondary_sectors || [],
      // Use estimated_value as last_round_value (placeholder until researched)
      last_round_value: company.estimated_value,
      last_round_date: null,
      last_round_confirmed: false,
      // Will be researched immediately below
      last_researched_at: null,
      last_valuation_at: null,
      created_by: 'ticker_seed',
    })
    .select()
    .single();

  if (error) {
    console.error(`✗ ${company.name} - Error:`, error.message);
  } else {
    console.log(`✓ ${company.name} (${company.symbol}) - $${company.estimated_value}B`);
    inserted++;

    // RECURRENCE PREVENTION: Trigger research immediately (same as POST /api/lumen/companies)
    // This ensures bulk-seeded companies don't create a zero-evidence gap
    try {
      const SITE_URL = env.SITE_URL || 'https://decisionlayer.dev';
      const researchResponse = await fetch(`${SITE_URL}/api/lumen/companies/${newCompany.id}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (researchResponse.ok) {
        const researchData = await researchResponse.json();
        console.log(`  └─ Researched: ${researchData.evidence?.length || 0} evidence items found`);
      } else {
        console.log(`  └─ Research queued for cron (API unavailable)`);
      }
    } catch (err) {
      console.log(`  └─ Research queued for cron (${err.message})`);
    }

    // Rate limit between companies
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

console.log(`\nDone! Inserted: ${inserted}, Skipped: ${skipped}`);
console.log('\nNote: All new companies are researched immediately during seed.');
console.log('If research API was unavailable, cron will catch them within 1-2 days.');
