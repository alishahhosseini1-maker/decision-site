#!/usr/bin/env node

/**
 * Re-parse existing evidence descriptions to populate missing value fields
 * Fixes evidence added before parser supported millions
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Inline parser (updated version)
function parseValuationFromText(text) {
  if (!text) return null;

  const postMoneyPattern = /(?:at\s+a?\s*)?\$\s*([\d,.]+)\s*([MB]|billion|million)\s+post-money/i;
  let match = text.match(postMoneyPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  const valuationPattern = /(?:valued at|valuation of|valuation:|at a)\s*\$?\s*([\d,.]+)\s*([MB]|billion|million)(?:\s|,|\.|\))/i;
  match = text.match(valuationPattern);
  if (match) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    const unit = match[2].toUpperCase();
    return (unit === 'M' || unit === 'MILLION') ? value / 1000 : value;
  }

  return null;
}

console.log('========================================');
console.log('RE-PARSING EVIDENCE VALUES');
console.log('========================================\n');

// Get all Funding evidence with NULL values but descriptions that mention valuations
const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('id, description, value, company_id')
  .eq('category', 'Funding')
  .is('value', null);

console.log(`Found ${evidence?.length || 0} Funding items with NULL values\n`);

if (!evidence || evidence.length === 0) {
  console.log('No evidence to reparse');
  process.exit(0);
}

let updatedCount = 0;
let skippedCount = 0;

for (const item of evidence) {
  const parsedValue = parseValuationFromText(item.description);

  if (parsedValue !== null) {
    // Update the value field
    const { error } = await supabase
      .from('lumen_evidence')
      .update({ value: parsedValue.toString() })
      .eq('id', item.id);

    if (error) {
      console.log(`✗ Failed to update ${item.id}: ${error.message}`);
    } else {
      console.log(`✓ Updated: "${item.description.substring(0, 60)}..."`);
      console.log(`  Value: NULL → ${parsedValue}B\n`);
      updatedCount++;
    }
  } else {
    skippedCount++;
  }
}

console.log('========================================');
console.log('REPARSE COMPLETE');
console.log('========================================\n');

console.log(`Updated: ${updatedCount} evidence items`);
console.log(`Skipped: ${skippedCount} items (no valuation found in description)\n`);

if (updatedCount > 0) {
  console.log('Next step: Re-run valuations for affected companies to use new values');
}
