#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Updating Anthropic secondary citation URL...\n');

// Find the corrected evidence (value should now be $1.2T)
const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .ilike('description', '%Business Insider%1.2 trillion%')
  .single();

if (!evidence) {
  console.log('❌ Evidence not found');
  process.exit(1);
}

console.log('Current state:');
console.log(`  Citation URL: ${evidence.citation_url || 'NULL'}`);
console.log();

// Update with working citation URL
// Using Qz coverage of the BI story (BI blocks web search)
const citationUrl = 'https://qz.com/anthropic-secondary-market-valuation-1-2-trillion-070926';

const { error } = await supabase
  .from('lumen_evidence')
  .update({ 
    citation_url: citationUrl,
    source_label: 'Business Insider (via Qz)' // Note it's BI story via Qz
  })
  .eq('id', evidence.id);

if (error) {
  console.log('❌ Error:', error);
} else {
  console.log('✓ Citation updated:');
  console.log(`  URL: ${citationUrl}`);
  console.log(`  Source: Business Insider (via Qz)`);
  console.log();
  console.log('Note: Using Qz coverage of original BI story');
  console.log('      (Business Insider blocks Claude web search)');
}
