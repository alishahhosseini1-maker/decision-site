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

// Search for Anduril
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name, current_valuation')
  .ilike('name', '%Anduril%');

console.log(`Found ${companies?.length || 0} companies:`);
companies?.forEach(c => {
  console.log(`  ${c.name} (${c.id}): $${c.current_valuation}B`);
});
