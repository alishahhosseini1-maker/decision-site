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

// Get all companies
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('name, slug, last_round_value, last_round_date, secondary_value, last_researched_at')
  .order('name');

console.log(`Total companies: ${companies?.length || 0}\n`);
companies?.forEach(c => {
  const lr = c.last_round_value ? `LR:$${c.last_round_value}B` : 'LR:none';
  const sec = c.secondary_value ? `Sec:$${c.secondary_value}B` : 'Sec:none';
  const researched = c.last_researched_at ? 'researched' : 'not-researched';
  console.log(`  ${c.name} (${c.slug}): ${lr}, ${sec}, ${researched}`);
});
