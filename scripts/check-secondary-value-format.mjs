#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Check how secondary values are stored
const { data: secondary } = await supabase
  .from('lumen_evidence')
  .select('value, description, source_label')
  .eq('category', 'Secondary');

console.log('Secondary evidence value formats:\n');
secondary?.forEach((item, i) => {
  console.log(`${i + 1}. Value: ${item.value} (type: ${typeof item.value})`);
  console.log(`   Source: ${item.source_label}`);
  console.log(`   Description: ${item.description.substring(0, 80)}`);
  console.log();
});
