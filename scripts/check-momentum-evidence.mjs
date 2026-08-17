#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMomentum(name) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id')
    .ilike('name', `%${name}%`)
    .single();

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('category')
    .eq('company_id', company.id);

  const momentum = ['Revenue', 'Headcount', 'Product', 'Contracts', 'Metrics'];
  const hasMomentum = evidence?.some(e => momentum.includes(e.category));
  
  return hasMomentum;
}

const companies = ['Stripe', 'Ramp', 'Anduril', 'SpaceX'];

for (const name of companies) {
  const hasMomentum = await checkMomentum(name);
  console.log(`${name}: ${hasMomentum ? 'HAS momentum evidence' : 'NO momentum evidence (funding-only)'}`);
}
