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
  .eq('category', 'Revenue');

console.log('Searching all Revenue evidence for Q1/4.8B/three months:\n');

const found = evidence?.filter(e => {
  const text = `${e.value} ${e.description}`.toLowerCase();
  return text.includes('4.8') || text.includes('q1') || text.includes('three months') || text.includes('march 2026');
});

if (found && found.length > 0) {
  console.log(`Found ${found.length} matching item(s):\n`);
  found.forEach(e => {
    console.log(`Status: ${e.status}`);
    console.log(`Date: ${e.date}`);
    console.log(`Value: ${e.value}`);
    console.log(`Description: ${e.description}`);
    console.log();
  });
} else {
  console.log('No evidence found with Q1/4.8B/three months/March 2026.');
  console.log('\nUser may have seen this in the UI but it might not be in Revenue category,');
  console.log('or might be in a different evidence category, or in the valuation explanation.');
}

console.log('\nChecking if it might be in the valuation explanation instead:');

const { data: valuation } = await supabase
  .from('lumen_valuations')
  .select('explanation')
  .eq('company_id', '9bc85cca-71fe-48db-ac09-8b32b03275d3')
  .order('generated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (valuation?.explanation) {
  const hasQ1 = valuation.explanation.toLowerCase().includes('4.8') || 
                 valuation.explanation.toLowerCase().includes('q1') ||
                 valuation.explanation.toLowerCase().includes('three months');
  
  if (hasQ1) {
    console.log('✓ Found reference in valuation explanation:');
    const lines = valuation.explanation.split('\n');
    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.includes('4.8') || lower.includes('q1') || lower.includes('three months')) {
        console.log(`  "${line}"`);
      }
    });
  } else {
    console.log('Not found in valuation explanation either.');
  }
}
