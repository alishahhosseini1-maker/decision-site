import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: evidence } = await supabase
  .from('lumen_evidence')
  .select('*')
  .eq('company_id', '9bc85cca-71fe-48db-ac09-8b32b03275d3')
  .eq('category', 'Revenue')
  .eq('status', 'verified')
  .in('date', ['2026-03-10', '2026-02-13']);

console.log('Checking Mar 10 vs Feb 13 revenue items:\n');

evidence?.forEach(e => {
  console.log(`Date: ${e.date}`);
  console.log(`Value: ${e.value}`);
  console.log(`Full Description: ${e.description}`);
  console.log();
  
  const text = `${e.value} ${e.description}`.toLowerCase();
  console.log(`Contains "run-rate": ${text.includes('run-rate')}`);
  console.log(`Regex match: ${/\b(run-rate|annualized revenue in 20(2[4-6]))\b/i.test(text)}`);
  console.log();
  console.log('─'.repeat(80));
  console.log();
});
