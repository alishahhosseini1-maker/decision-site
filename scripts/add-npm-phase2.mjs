#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Phase 2: NPM prices for newly created companies with full fair-value estimates
// Verified Aug 19, 2026 - full 5-step verification completed for each
const verifiedPrices = [
  {
    companyName: 'Glean',
    price: '47.99',
    date: '2026-08-06',
    description: 'Nasdaq Private Market estimate: $47.99/share as of Aug 6, 2026. Methodology: "Based on market activity, publicly-sourced valuation data, and other proprietary information" (disclosed on NPM website). Last verified Aug 19, 2026.',
    url: 'https://nasdaqprivatemarket.com/company/glean/'
  },
  {
    companyName: 'Harvey',
    price: '35.83',
    date: '2026-08-06',
    description: 'Nasdaq Private Market estimate: $35.83/share as of Aug 6, 2026. Methodology: "Based on market activity, publicly-sourced valuation data, and other proprietary information" (disclosed on NPM website). Last verified Aug 19, 2026.',
    url: 'https://nasdaqprivatemarket.com/company/harvey/'
  },
  {
    companyName: 'PsiQuantum',
    price: '30.09',
    date: '2026-08-06',
    description: 'Nasdaq Private Market estimate: $30.09/share as of Aug 6, 2026. Methodology: "Based on market activity, publicly-sourced valuation data, and other proprietary information" (disclosed on NPM website). Last verified Aug 19, 2026.',
    url: 'https://nasdaqprivatemarket.com/company/psiquantum/'
  }
];

// Get company IDs
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name')
  .in('name', ['Glean', 'Harvey', 'PsiQuantum']);

console.log(`Found ${companies?.length || 0} companies in database\n`);

// Create entries
const entries = [];
for (const price of verifiedPrices) {
  const company = companies?.find(c => c.name === price.companyName);
  if (!company) {
    console.log(`⚠️  ${price.companyName} not found in database - skipping`);
    continue;
  }

  entries.push({
    company_id: company.id,
    category: 'Marketplace Price',
    description: price.description,
    value: price.price,
    source_type: 'Industry Research',
    source_label: 'Nasdaq Private Market',
    date: price.date,
    contributor: 'manual-verification',
    status: 'verified',
    verified_by: ['manual-verification'],
    citation_url: price.url,
    affiliation_disclosed: false,
  });

  console.log(`✓ Prepared ${price.companyName}: $${price.price}/share`);
}

// Check for existing entries
const { data: existing } = await supabase
  .from('lumen_evidence')
  .select('*')
  .in('company_id', entries.map(e => e.company_id))
  .eq('category', 'Marketplace Price')
  .eq('source_label', 'Nasdaq Private Market');

if (existing && existing.length > 0) {
  console.log(`\n⚠️  Found ${existing.length} existing NPM Marketplace Price entries:`);
  existing.forEach(e => {
    const company = companies?.find(c => c.id === e.company_id);
    console.log(`  - ${company?.name}: $${e.value}/share (${e.date})`);
  });
  console.log('\nSkipping insert to avoid duplicates.');
  process.exit(0);
}

// Insert entries
const { data: inserted, error } = await supabase
  .from('lumen_evidence')
  .insert(entries)
  .select('*');

if (error) {
  console.error('\n❌ Error inserting entries:', error);
  process.exit(1);
}

console.log(`\n✅ Successfully added ${inserted.length} marketplace price entries`);
inserted.forEach(e => {
  const company = companies?.find(c => c.id === e.company_id);
  console.log(`  - ${company?.name}: $${e.value}/share (${e.date})`);
});
