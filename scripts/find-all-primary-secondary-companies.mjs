#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Finding all companies with BOTH primary and secondary evidence...\n');

const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name');

const withBoth = [];

for (const company of companies || []) {
  // Skip SpaceX (now public)
  if (company.name.toLowerCase().includes('spacex')) continue;

  const { data: primary } = await supabase
    .from('lumen_evidence')
    .select('date, value')
    .eq('company_id', company.id)
    .eq('category', 'Funding')
    .not('value', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  const { data: secondary } = await supabase
    .from('lumen_evidence')
    .select('date, value, description')
    .eq('company_id', company.id)
    .eq('category', 'Secondary')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (primary && secondary) {
    withBoth.push({
      name: company.name,
      id: company.id,
      primaryDate: primary.date,
      primaryValue: primary.value,
      secondaryDate: secondary.date,
      secondaryValue: secondary.value?.substring(0, 50),
    });
  }
}

console.log(`Found ${withBoth.length} private companies with both primary + secondary:\n`);

withBoth.forEach((c, i) => {
  console.log(`${i + 1}. ${c.name}`);
  console.log(`   Primary: $${c.primaryValue}B (${c.primaryDate})`);
  console.log(`   Secondary: ${c.secondaryValue}... (${c.secondaryDate})`);
  console.log();
});

if (withBoth.length === 0) {
  console.log('Only Anthropic has both evidence types in the current dataset.');
  console.log('Cannot validate formula parameters with n=1.');
  console.log('Recommendation: Use Anthropic as initial test, validate on more companies as data grows.');
}
