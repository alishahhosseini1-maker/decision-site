#!/usr/bin/env node
/**
 * Test funding chart regex extraction across multiple companies.
 * Check how often "raised $XB" pattern matches vs. falls back to 0.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Same extraction logic as app/page.tsx
function extractRaisedAmount(description) {
  const raisedMatch = description.match(/raised\s+\$?([\d.]+)\s*([BTM])/i);
  if (raisedMatch) {
    const amount = parseFloat(raisedMatch[1]);
    const unit = raisedMatch[2].toUpperCase();
    if (unit === 'B') return amount;
    if (unit === 'M') return amount / 1000;
    if (unit === 'T') return amount * 1000;
  }
  return null; // No match
}

async function testCompany(companyName) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .ilike('name', companyName)
    .single();

  if (!company) {
    console.log(`❌ Company "${companyName}" not found`);
    return null;
  }

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .eq('category', 'Funding')
    .eq('status', 'verified')
    .order('date', { ascending: true });

  if (!evidence || evidence.length === 0) {
    console.log(`\n${company.name}: No verified funding evidence`);
    return null;
  }

  console.log(`\n${company.name} (${evidence.length} verified funding rounds):`);
  console.log('─'.repeat(80));

  let matchCount = 0;
  let failCount = 0;

  evidence.forEach((e, i) => {
    const raised = extractRaisedAmount(e.description);
    const status = raised !== null ? '✓' : '✗';

    if (raised !== null) {
      matchCount++;
      console.log(`${status} ${e.date} — Extracted: $${raised}B`);
      console.log(`   "${e.description.substring(0, 100)}..."`);
    } else {
      failCount++;
      console.log(`${status} ${e.date} — FAILED TO EXTRACT (will show as missing bar)`);
      console.log(`   "${e.description.substring(0, 100)}..."`);
    }
  });

  console.log(`\nMatch rate: ${matchCount}/${evidence.length} (${failCount} failed)`);

  return { company: company.name, total: evidence.length, matched: matchCount, failed: failCount };
}

async function main() {
  console.log('FUNDING CHART REGEX EXTRACTION — CROSS-COMPANY TEST');
  console.log('='.repeat(80));
  console.log('\nTesting "raised $XB" pattern across diverse companies...\n');

  // Test diverse sample: large/small, different sectors
  const testCompanies = [
    'OpenAI',      // Worst duplicate offender
    'Faire',       // E-commerce
    'SpaceX',      // Aerospace
    'Notion',      // Productivity
    'Rippling',    // HR/payroll
    'Anduril',     // Defense
  ];

  const results = [];
  for (const name of testCompanies) {
    const result = await testCompany(name);
    if (result) results.push(result);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const totalRounds = results.reduce((sum, r) => sum + r.total, 0);
  const totalMatched = results.reduce((sum, r) => sum + r.matched, 0);
  const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

  console.log(`\nTested ${results.length} companies, ${totalRounds} funding rounds total:`);
  console.log(`  ✓ Matched: ${totalMatched}/${totalRounds} (${((totalMatched/totalRounds)*100).toFixed(1)}%)`);
  console.log(`  ✗ Failed:  ${totalFailed}/${totalRounds} (${((totalFailed/totalRounds)*100).toFixed(1)}%)`);

  if (totalFailed > 0) {
    console.log(`\n⚠️  FRAGILITY DETECTED: ${totalFailed} rounds will show as missing bars`);
    console.log('   Recommend: fallback to .value field if regex fails, or expand regex patterns');
  } else {
    console.log('\n✅ REGEX ROBUST: All funding rounds extracted successfully');
  }

  console.log('\nCompany breakdown:');
  results.forEach(r => {
    const rate = r.total > 0 ? `${r.matched}/${r.total}` : 'no data';
    const status = r.failed > 0 ? '⚠️ ' : '✓ ';
    console.log(`  ${status}${r.company}: ${rate}`);
  });
}

main().catch(console.error);
