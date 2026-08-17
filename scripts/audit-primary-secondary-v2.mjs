#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('AUDIT: Primary + Secondary Evidence Weighting');
console.log('='.repeat(80));
console.log();

// Get SpaceX and Anthropic specifically
const companies = ['SpaceX', 'Anthropic'];

for (const companyName of companies) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .ilike('name', companyName)
    .single();

  if (!company) continue;

  // Get most recent funding
  const { data: funding } = await supabase
    .from('lumen_evidence')
    .select('date, value, description')
    .eq('company_id', company.id)
    .eq('category', 'Funding')
    .not('value', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Get most recent secondary
  const { data: secondary } = await supabase
    .from('lumen_evidence')
    .select('date, value, description, source_type')
    .eq('company_id', company.id)
    .eq('category', 'Secondary')
    .order('date', { ascending: false })
    .limit(1)
    .single();

  // Get latest valuation
  const { data: valuation } = await supabase
    .from('lumen_valuations')
    .select('base_case, explanation')
    .eq('company_id', company.id)
    .order('generated_at', { ascending: false })
    .limit(1)
    .single();

  console.log(`${company.name}:`);
  console.log(`  Primary: $${funding?.value || 'none'}B (${funding?.date || 'no date'})`);
  console.log(`    "${funding?.description?.substring(0, 80)}..."`);
  console.log(`  Secondary: ${secondary?.value || 'none'} (${secondary?.date || 'no date'})`);
  console.log(`    "${secondary?.description?.substring(0, 80)}..."`);
  console.log(`  Base case: $${valuation?.base_case || 'none'}B`);
  console.log();

  // Extract weighting logic from explanation
  const explanation = valuation?.explanation || '';
  const anchorMatch = explanation.match(/anchor[ed]* (?:to|on|at|primarily on) (.*?)[,\.]/i);
  if (anchorMatch) {
    console.log(`  Weighting logic: "${anchorMatch[1]}"`);
  }
  
  // Check if secondary is mentioned
  const mentionsSecondary = explanation.toLowerCase().includes('secondary');
  console.log(`  Mentions secondary in explanation: ${mentionsSecondary ? 'YES' : 'NO'}`);
  console.log();
  console.log('-'.repeat(80));
  console.log();
}

console.log('='.repeat(80));
console.log('KEY FINDING');
console.log('='.repeat(80));
console.log('Need to check how each company weights primary vs secondary in base case.');
console.log('If explanations differ in methodology, that indicates inconsistency.');
