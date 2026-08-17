#!/usr/bin/env node

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('Adding CHECK constraint for Secondary date requirement...\n');

const sql = `
ALTER TABLE lumen_evidence
ADD CONSTRAINT secondary_requires_date
CHECK (category != 'Secondary' OR date IS NOT NULL);
`;

// Note: Supabase client doesn't support DDL directly, need to use SQL editor or API
console.log('SQL to run in Supabase SQL Editor:');
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
console.log('\nManual step required: Run this SQL in Supabase dashboard > SQL Editor');
console.log('(Supabase JS client does not support ALTER TABLE DDL operations)');
