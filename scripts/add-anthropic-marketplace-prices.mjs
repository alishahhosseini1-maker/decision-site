#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';
const TODAY = '2026-08-19';

// Manually verified marketplace prices with disclosed methodologies
const marketplacePrices = [
  {
    company_id: ANTHROPIC_ID,
    category: 'Marketplace Price',
    description: 'Nasdaq Private Market estimate: $685.62/share as of Aug 5, 2026. Methodology: "Based on market activity, publicly-sourced valuation data, and other proprietary information" (disclosed on NPM website).',
    value: '685.62',
    source_type: 'Industry Research',
    source_label: 'Nasdaq Private Market',
    date: '2026-08-05',
    contributor: 'manual-verification',
    status: 'verified',
    verified_by: ['manual-verification'],
    citation_url: 'https://nasdaqprivatemarket.com/company/anthropic/',
    affiliation_disclosed: false,
  },
  {
    company_id: ANTHROPIC_ID,
    category: 'Marketplace Price',
    description: 'Forge Price (republished by Yahoo Finance and CNBC): $721.85/share as of Aug 19, 2026. Methodology: "Proprietary model incorporating pricing inputs from publicly-available primary funding round information, secondary market transactions and indications of interest" (disclosed by Forge Global).',
    value: '721.85',
    source_type: 'Industry Research',
    source_label: 'Forge Price (Yahoo Finance)',
    date: TODAY,
    contributor: 'manual-verification',
    status: 'verified',
    verified_by: ['manual-verification'],
    citation_url: 'https://finance.yahoo.com/quote/ANTH.PVT',
    affiliation_disclosed: false,
  }
];

// Check for existing marketplace prices
const { data: existing } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', ANTHROPIC_ID)
  .eq('category', 'Marketplace Price');

console.log(`Found ${existing?.length || 0} existing Marketplace Price entries`);

if (existing && existing.length > 0) {
  console.log('\nExisting entries:');
  existing.forEach(e => {
    console.log(`  - ${e.source_label}: $${e.value}/share (${e.date})`);
  });
  console.log('\nSkipping insert to avoid duplicates. Delete existing entries first if you want to re-add.');
  process.exit(0);
}

// Insert new entries
const { data: inserted, error } = await supabase
  .from('lumen_evidence')
  .insert(marketplacePrices)
  .select('*');

if (error) {
  console.error('Error inserting marketplace prices:', error);
  process.exit(1);
}

console.log(`\n✅ Successfully added ${inserted.length} marketplace price entries:`);
inserted.forEach(e => {
  console.log(`  - ${e.source_label}: $${e.value}/share (${e.date})`);
  console.log(`    Methodology: ${e.description.split('Methodology:')[1]?.substring(0, 80)}...`);
});
