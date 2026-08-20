#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Only restore NPM prices for companies with REAL (non-null) base cases
// PsiQuantum excluded: has null base case (insufficient evidence)
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
  }
];

console.log('=== RESTORING NPM PRICES (Glean, Harvey only) ===\n');

const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name')
  .in('name', ['Glean', 'Harvey']);

const entries = [];
for (const price of verifiedPrices) {
  const company = companies?.find(c => c.name === price.companyName);
  if (!company) {
    console.log(`⚠️  ${price.companyName} not found`);
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

const { data: inserted, error } = await supabase
  .from('lumen_evidence')
  .insert(entries)
  .select('*');

if (error) {
  console.error('\n❌ Error:', error);
  process.exit(1);
}

console.log(`\n✅ Restored ${inserted.length} NPM prices (PsiQuantum excluded: null base case)`);
