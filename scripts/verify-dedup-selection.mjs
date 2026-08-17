#!/usr/bin/env node
/**
 * Spot-check deduplication selection logic on worst offenders.
 * Verify kept records are genuinely the best (right value, date, source).
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function checkCompany(companyName, suspectDate) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`${companyName.toUpperCase()} — Checking ${suspectDate} round`);
  console.log('='.repeat(80));

  const { data: company } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .ilike('name', companyName)
    .single();

  if (!company) {
    console.log(`❌ Company "${companyName}" not found`);
    return;
  }

  // Get all evidence for this date (including deleted ones via created_at history)
  // Since we can't see deleted rows, we'll just check what exists now
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .eq('category', 'Funding')
    .gte('date', suspectDate)
    .lte('date', suspectDate)
    .order('created_at', { ascending: true });

  if (!evidence || evidence.length === 0) {
    console.log(`\n❌ No evidence found for ${suspectDate} (may have been fully deduplicated)`);
    return;
  }

  console.log(`\nFound ${evidence.length} record(s) for ${suspectDate}:`);

  evidence.forEach((e, i) => {
    console.log(`\n${i + 1}. ID: ${e.id}`);
    console.log(`   Status: ${e.status}`);
    console.log(`   Source: ${e.source_type}`);
    console.log(`   Value: ${e.value}`);
    console.log(`   Description: "${e.description.substring(0, 100)}..."`);
    console.log(`   Created: ${e.created_at}`);
    console.log(`   Contributor: ${e.contributor}`);
  });

  if (evidence.length === 1) {
    const kept = evidence[0];
    console.log(`\n✓ DEDUP RESULT: Single record kept (duplicates removed)`);
    console.log(`  Status: ${kept.status} (${kept.status === 'verified' ? '✓ best' : '⚠️ check if verified existed'})`);
    console.log(`  Source: ${kept.source_type}`);

    const sourceRank = {
      'SEC / Government Filing': 5,
      'Company Announcement': 4,
      'Reputable Publication': 3,
      'Industry Research': 2,
      'Social Media': 1,
      'Unattributed': 0,
    };

    const rank = sourceRank[kept.source_type] ?? -1;
    if (rank >= 3) {
      console.log(`  Source quality: HIGH (rank ${rank}/5) ✓`);
    } else if (rank >= 1) {
      console.log(`  Source quality: MEDIUM (rank ${rank}/5) — acceptable but check if higher existed`);
    } else {
      console.log(`  Source quality: LOW (rank ${rank}/5) ⚠️ — verify this was the best available`);
    }

    console.log(`  Value: $${kept.value}B`);
    console.log(`  Date: ${kept.date}`);

    // Extract raised amount to verify it's reasonable
    const raisedMatch = kept.description.match(/raised\s+(?:approximately|around|about)?\s*\$?([\d.]+)\s*([BTM])/i);
    if (raisedMatch) {
      const amount = parseFloat(raisedMatch[1]);
      const unit = raisedMatch[2].toUpperCase();
      let amountB = amount;
      if (unit === 'M') amountB = amount / 1000;
      if (unit === 'T') amountB = amount * 1000;
      console.log(`  Raised: $${amountB}B (extracted from description) ✓`);
    } else {
      console.log(`  Raised: FAILED TO EXTRACT ⚠️`);
    }

  } else {
    console.log(`\n⚠️  UNEXPECTED: ${evidence.length} records still exist (dedup incomplete?)`);
    console.log(`   Expected: 1 record after deduplication`);
  }
}

async function main() {
  console.log('DEDUPLICATION SELECTION LOGIC — SPOT CHECK');
  console.log('='.repeat(80));
  console.log('\nVerifying worst offenders kept the RIGHT record...\n');

  // OpenAI: 6× duplicate for March 2026 ($852B round)
  await checkCompany('OpenAI', '2026-03-31');

  // Faire: 5× duplicate for Dec 2018 ($535M round)
  await checkCompany('Faire', '2018-12-14');

  console.log('\n' + '='.repeat(80));
  console.log('MANUAL REVIEW QUESTIONS TO ASK:');
  console.log('='.repeat(80));
  console.log(`
1. Is the kept record VERIFIED (not pending)?
2. Is the source high-quality (Reputable Publication or better)?
3. Does the value make sense for that date/round?
4. Does the "raised" amount extract correctly?

If all ✓, dedup selection logic is working correctly.
If any ⚠️, review dedup script logic (scripts/deduplicate-evidence.mjs:36-52).
  `);
}

main().catch(console.error);
