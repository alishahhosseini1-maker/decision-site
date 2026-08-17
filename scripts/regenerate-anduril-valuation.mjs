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

const ANDURIL_ID = 'f848c33d-217f-44fc-b1fb-2e85f1faceeb';

console.log('Triggering valuation generation for Anduril...\n');

// Call the API endpoint to generate valuation
const response = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL.replace('supabase.co', 'supabase.co')}/api/lumen/companies/${ANDURIL_ID}/valuation`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
  }
});

if (!response.ok) {
  console.log('❌ Error calling API:');
  console.log(await response.text());
} else {
  const result = await response.json();
  console.log('✓ Valuation generated:');
  console.log(JSON.stringify(result, null, 2));
}
