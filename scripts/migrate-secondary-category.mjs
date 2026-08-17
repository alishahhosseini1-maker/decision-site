#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Migrating "Secondary market" → "Secondary"\n');

// Update evidence items
const { data: updated, error } = await supabase
  .from('lumen_evidence')
  .update({ category: 'Secondary' })
  .eq('category', 'Secondary market')
  .select();

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log(`✓ Migrated ${updated?.length || 0} evidence items`);
  updated?.forEach((item, i) => {
    console.log(`  ${i + 1}. ${item.description.substring(0, 60)}... (${item.date})`);
  });
}
