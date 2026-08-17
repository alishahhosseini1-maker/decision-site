#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Fixing Anthropic secondary evidence citation error\n');

// Find the incorrect evidence item
const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .ilike('description', '%Business Insider%1.5 trillion%')
  .single();

if (!evidence) {
  console.log('❌ Evidence item not found');
  process.exit(1);
}

console.log('Found incorrect evidence:');
console.log(`  Date: ${evidence.date}`);
console.log(`  Value: ${evidence.value}`);
console.log(`  Description: ${evidence.description.substring(0, 100)}...`);
console.log();

// Correct values
const corrected = {
  date: '2026-07-09', // Actual Business Insider report date (July 9-10, 2026)
  value: '$1.2T secondary market valuation', // Actual reported figure
  description: 'Business Insider reported that Anthropic shares were changing hands on secondary markets at valuations around $1.2 trillion, based on interviews with three secondary market traders (Caplight Securities and Rainmaker Securities CEOs quoted by name).',
  citation_url: null, // Placeholder - actual URL not provided, needs manual update
};

console.log('Correcting to:');
console.log(`  Date: ${corrected.date} (was ${evidence.date})`);
console.log(`  Value: ${corrected.value} (was ${evidence.value})`);
console.log(`  Description: ${corrected.description}`);
console.log(`  Citation: ${corrected.citation_url || 'NULL (needs actual URL)'}`);
console.log();

const { error } = await supabase
  .from('lumen_evidence')
  .update(corrected)
  .eq('id', evidence.id);

if (error) {
  console.log('❌ Error updating:', error);
} else {
  console.log('✓ Evidence corrected');
  console.log();
  console.log('NOTE: citation_url set to NULL - needs actual Business Insider article URL');
  console.log('      from July 9-10, 2026 report');
}
