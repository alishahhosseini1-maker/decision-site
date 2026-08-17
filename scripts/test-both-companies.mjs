#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Get both Anthropic companies (there are two with different cases)
const { data: companies } = await supabase
  .from('lumen_companies')
  .select('id, name')
  .or('name.ilike.Anthropic,name.ilike.anthropic');

console.log(`Found ${companies?.length} Anthropic entries:`);
companies?.forEach(c => console.log(`  - ${c.name} (${c.id})`));

// Use the first one with data
for (const company of companies || []) {
  const { data: secondary } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .eq('category', 'Secondary')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  if (secondary) {
    console.log(`\nUsing: ${company.name}`);
    console.log(`  Has secondary evidence: ${secondary.date}`);
    console.log(`  Value: ${secondary.value}`);
    break;
  }
}
