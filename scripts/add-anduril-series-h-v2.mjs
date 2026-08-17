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

const ANDURIL_ID = 'f848c33d-217f-44fc-b1fb-2e85f1faceeb';

console.log('Adding Anduril Series H evidence...\n');

const evidence = {
  company_id: ANDURIL_ID,
  category: 'Funding',
  date: '2026-05-15', // Approx May 2026
  description: 'Anduril Industries raised $5B at a $61B post-money valuation in May 2026 in a Series H round',
  value: 61.0,
  source_type: 'Reputable Publication',
  source_label: 'Bloomberg / Sacra',
  contributor: 'manual-correction',
  status: 'verified',
  round_type: 'Series H',
  funding_amount: 5.0,
  citation_url: null
};

const { data, error } = await supabase
  .from('lumen_evidence')
  .insert([evidence])
  .select();

if (error) {
  console.log('❌ Error adding evidence:');
  console.log(error);
} else {
  console.log('✓ Added Series H evidence:');
  console.log(`  Date: ${data[0].date}`);
  console.log(`  Value: $${data[0].value}B`);
  console.log(`  Description: ${data[0].description}`);
}
