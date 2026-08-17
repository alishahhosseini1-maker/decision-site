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

console.log('Testing Supabase connection...');
console.log(`URL: ${env.NEXT_PUBLIC_SUPABASE_URL}\n`);

// Try to query the lumen_companies table
const { data, error, count } = await supabase
  .from('lumen_companies')
  .select('*', { count: 'exact', head: false })
  .limit(1);

if (error) {
  console.log('❌ Error querying lumen_companies:');
  console.log(error);
} else {
  console.log(`✓ Successfully connected`);
  console.log(`  Row count: ${count || 0}`);
  if (data && data.length > 0) {
    console.log(`  Sample row: ${JSON.stringify(data[0], null, 2)}`);
  } else {
    console.log(`  Table is empty`);
  }
}

// Try to list all tables
console.log('\nQuerying information_schema...');
const { data: tables } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');

console.log(`Public tables: ${tables?.map(t => t.table_name).join(', ') || 'none'}`);
