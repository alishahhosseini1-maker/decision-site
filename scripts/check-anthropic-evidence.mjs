#!/usr/bin/env node
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const ANTHROPIC_ID = '9bc85cca-71fe-48db-ac09-8b32b03275d3';

const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', ANTHROPIC_ID)
  .eq('category', 'Funding')
  .order('date', { ascending: false });

console.log(`Found ${evidence?.length || 0} Funding evidence items for Anthropic:\n`);

evidence?.forEach((e, i) => {
  console.log(`${i + 1}. ${e.status} — ${e.value} — ${e.date}`);
  console.log(`   Description: ${e.description.substring(0, 100)}...`);
  console.log(`   Source: ${e.source_type}, Contributor: ${e.contributor}`);
  console.log(`   ID: ${e.id}`);
  console.log();
});
