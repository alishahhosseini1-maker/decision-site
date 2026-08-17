#!/usr/bin/env node
/**
 * Test revenue selection logic across multiple companies.
 * Verify it prefers current/run-rate over projected revenue.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Same prioritization logic as comps route
function getRevenuePriority(value, description) {
  const text = `${value} ${description}`.toLowerCase();

  // Highest priority: run-rate / annualized (standard for comps)
  if (/\b(run-rate|annualized revenue in 20(2[4-6]))\b/i.test(text)) return 3;

  // High priority: current/actual/TTM (but prefer run-rate)
  if (/\b(current|actual|ttm|trailing)\b/i.test(text)) return 2;

  // Projected indicators (low priority)
  if (/\b(project|forecast|expect|target|by 20(2[7-9]|3[0-9]))\b/i.test(text)) return 0;

  // Ambiguous or "to date" (medium-low priority - cumulative, not annual)
  return 1;
}

async function testCompany(companyId, companyName) {
  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .eq('id', companyId)
    .single();

  if (!company) {
    console.log(`❌ Company "${companyName}" not found`);
    return null;
  }

  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .eq('category', 'Revenue')
    .eq('status', 'verified')
    .order('date', { ascending: false});

  if (!evidence || evidence.length === 0) {
    console.log(`\n${company.name}: No verified revenue evidence`);
    return null;
  }

  console.log(`\n${company.name} (${evidence.length} verified revenue items):`);
  console.log('─'.repeat(80));

  // Show all revenue items with priority scores
  evidence.forEach((e, i) => {
    const priority = getRevenuePriority(e.value, e.description);
    const label = priority === 3 ? 'RUN-RATE' : priority === 2 ? 'CURRENT ' : priority === 0 ? 'PROJECTED' : 'AMBIGUOUS';
    const marker = i === 0 ? '→' : ' ';
    console.log(`${marker} ${e.date} — ${label} (priority ${priority})`);
    console.log(`  Value: ${e.value}`);
    console.log(`  Desc: ${e.description.substring(0, 100)}...`);
  });

  // Apply selection logic
  const sorted = [...evidence].sort((a, b) => {
    const aPriority = getRevenuePriority(a.value, a.description);
    const bPriority = getRevenuePriority(b.value, b.description);
    if (aPriority !== bPriority) return bPriority - aPriority;
    return (b.date || '').localeCompare(a.date || '');
  });

  const selected = sorted[0];
  const selectedPriority = getRevenuePriority(selected.value, selected.description);
  const isProjected = selectedPriority === 0;

  console.log(`\n✓ SELECTED:`);
  console.log(`  ${selected.date} — ${selected.value}`);
  console.log(`  Type: ${isProjected ? 'PROJECTED ⚠️' : 'CURRENT ✓'}`);
  console.log(`  Desc: ${selected.description.substring(0, 100)}...`);

  return {
    company: company.name,
    total: evidence.length,
    selected: selected.value,
    isProjected,
    allProjected: evidence.every(e => getRevenuePriority(e.value, e.description) === 0)
  };
}

async function main() {
  console.log('REVENUE SELECTION LOGIC — CROSS-COMPANY TEST');
  console.log('='.repeat(80));
  console.log('\nTesting preference for current/run-rate over projected revenue...\n');

  const testCompanies = [
    { id: '9bc85cca-71fe-48db-ac09-8b32b03275d3', name: 'Anthropic' }, // Has both current and projected
  ];

  const results = [];
  for (const company of testCompanies) {
    const result = await testCompany(company.id, company.name);
    if (result) results.push(result);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const projectedCount = results.filter(r => r.isProjected).length;
  const currentCount = results.filter(r => !r.isProjected).length;

  console.log(`\nTested ${results.length} companies with revenue evidence:`);
  console.log(`  ✓ Selected CURRENT revenue: ${currentCount}`);
  console.log(`  ⚠️  Selected PROJECTED revenue: ${projectedCount} (fallback when no current exists)`);

  console.log('\nCompany breakdown:');
  results.forEach(r => {
    const status = r.isProjected ? '⚠️ PROJECTED' : '✓ CURRENT';
    const note = r.allProjected ? ' (only projected available)' : '';
    console.log(`  ${status}: ${r.company}${note}`);
  });

  if (currentCount === 0 && projectedCount > 0) {
    console.log('\n⚠️  All companies fell back to projected revenue.');
    console.log('   Recommendation: Verify current revenue patterns are being detected correctly.');
  } else if (currentCount > 0) {
    console.log('\n✅ Selection logic working — prefers current over projected when available.');
  }
}

main().catch(console.error);
