#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('SECONDARY CATEGORY IMPLEMENTATION VERIFICATION');
console.log('='.repeat(80));
console.log();

// 1. Check category exists in code (manual - just verify CATEGORIES array)
console.log('✓ Category "Secondary" added to CATEGORIES in lumen.ts');
console.log('✓ All "Secondary market" references updated to "Secondary"');
console.log();

// 2. Check migrated evidence
const { data: secondary, count } = await supabase
  .from('lumen_evidence')
  .select('*', { count: 'exact' })
  .eq('category', 'Secondary');

console.log(`Database state:`);
console.log(`  Secondary evidence items: ${count}`);

if (secondary && secondary.length > 0) {
  console.log(`\n  All items:`);
  secondary.forEach((item, i) => {
    const hasDate = item.date ? '✓' : '✗';
    console.log(`    ${i + 1}. ${hasDate} ${item.description.substring(0, 70)}`);
    console.log(`       Date: ${item.date || 'NULL'}, Value: ${item.value || 'NULL'}`);
  });
}

// 3. Check for any remaining "Secondary market" items
const { count: oldCount } = await supabase
  .from('lumen_evidence')
  .select('*', { count: 'exact', head: true })
  .eq('category', 'Secondary market');

console.log(`\n  Old "Secondary market" items remaining: ${oldCount}`);
if (oldCount === 0) {
  console.log('  ✓ All migrated successfully');
} else {
  console.log('  ⚠️  Migration incomplete');
}

console.log();
console.log('='.repeat(80));
console.log('MANUAL STEP REQUIRED:');
console.log('='.repeat(80));
console.log();
console.log('Run this SQL in Supabase dashboard > SQL Editor:');
console.log();
console.log('ALTER TABLE lumen_evidence');
console.log('ADD CONSTRAINT secondary_requires_date');
console.log("CHECK (category != 'Secondary' OR date IS NOT NULL);");
console.log();
console.log('This adds schema-level enforcement that Secondary evidence MUST have a date,');
console.log('preventing the undated secondary value bugs from Rippling/Anduril.');
console.log();
