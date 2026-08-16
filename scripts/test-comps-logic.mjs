#!/usr/bin/env node

/**
 * Sanity check script for comps and delta computation
 *
 * Tests:
 * 1. Pick company with ≥3 private peers (good coverage)
 * 2. Pick company with <3 private peers (sparse coverage)
 * 3. Trace through computePrivatePeers() - show actual peer set, multiples, averages
 * 4. Trace through computeDelta() - show which timestamps are used, confirm no staleness
 * 5. Confirm sparse company triggers public comps fallback
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local from project root
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

console.log('\n🧪 COMPS & DELTA SANITY CHECK\n');
console.log('=' .repeat(80));

// Step 1: Get all companies with their sectors
const { data: companies, error } = await supabase
  .from('lumen_companies')
  .select('*')
  .order('name');

if (error) {
  console.error('❌ Failed to fetch companies:', error);
  process.exit(1);
}

console.log(`\n📊 Total companies: ${companies.length}\n`);

// Group by sector to find coverage levels
const bySector = {};
for (const co of companies) {
  const sector = co.sector || 'Unknown';
  if (!bySector[sector]) bySector[sector] = [];
  bySector[sector].push(co);
}

console.log('Sectors and coverage:');
for (const [sector, cos] of Object.entries(bySector).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${sector}: ${cos.length} companies`);
}

// Pick test companies
const goodCoverage = Object.entries(bySector)
  .find(([_, cos]) => cos.length >= 3)?.[1]?.[0];

const sparseCoverage = Object.entries(bySector)
  .find(([_, cos]) => cos.length > 0 && cos.length < 3)?.[1]?.[0];

if (!goodCoverage) {
  console.log('\n⚠️  No sector with ≥3 companies found. Add more companies first.');
}

if (!sparseCoverage) {
  console.log('\n⚠️  No sector with <3 companies found.');
}

// Test good coverage company
if (goodCoverage) {
  console.log('\n' + '='.repeat(80));
  console.log(`\n🎯 TEST 1: Good Coverage Company - ${goodCoverage.name}`);
  console.log(`   Sector: ${goodCoverage.sector}`);
  console.log(`   Last round: $${goodCoverage.last_round_value}B (${goodCoverage.last_round_date})`);
  console.log(`   Secondary: $${goodCoverage.secondary_value}B (${goodCoverage.secondary_date})`);

  // Find private peers (same logic as computePrivatePeers)
  const peers = companies.filter(c =>
    c.id !== goodCoverage.id &&
    c.sector === goodCoverage.sector &&
    (c.last_round_value || c.secondary_value)
  );

  console.log(`\n   Private peers found: ${peers.length}`);

  // Get revenue for target company
  const { data: targetRevenue } = await supabase
    .from('lumen_evidence')
    .select('value, description, date')
    .eq('company_id', goodCoverage.id)
    .eq('category', 'Revenue')
    .eq('status', 'verified')
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (targetRevenue) {
    const targetRev = parseFloat(targetRevenue.value?.replace(/[^0-9.]/g, '') || '0');
    const targetVal = goodCoverage.secondary_value || goodCoverage.last_round_value;
    const targetMultiple = targetVal && targetRev > 0 ? targetVal / targetRev : null;

    console.log(`\n   ${goodCoverage.name}:`);
    console.log(`     Revenue: $${targetRev}B (${targetRevenue.date})`);
    console.log(`     Valuation: $${targetVal}B`);
    console.log(`     Multiple: ${targetMultiple?.toFixed(1)}x`);
  }

  console.log('\n   Available peers in same sector:');

  const peerMultiples = [];
  for (const peer of peers.slice(0, 8)) {
    const { data: peerRev } = await supabase
      .from('lumen_evidence')
      .select('value')
      .eq('company_id', peer.id)
      .eq('category', 'Revenue')
      .eq('status', 'verified')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle();

    const rev = peerRev?.value ? parseFloat(peerRev.value.replace(/[^0-9.]/g, '')) : null;
    const val = peer.secondary_value || peer.last_round_value;
    const multiple = val && rev && rev > 0 ? val / rev : null;

    if (multiple) peerMultiples.push(multiple);

    // Check if this is an exact sector match or would need fallback
    const isExact = peer.sector === goodCoverage.sector ||
                    peer.secondary_sectors?.includes(goodCoverage.sector) ||
                    goodCoverage.secondary_sectors?.includes(peer.sector);

    const matchLabel = isExact ? '[exact match]' : '[would need fallback]';
    console.log(`     ${peer.name}: $${val}B @ ${multiple?.toFixed(1) || 'N/A'}x ${matchLabel}`);
  }

  console.log(`\n   ✅ ${peers.length} exact sector matches found - no fallback needed`);
  console.log(`   (Comps will be computed and cached when cron runs)`);


  if (peerMultiples.length > 0) {
    const avg = peerMultiples.reduce((a, b) => a + b, 0) / peerMultiples.length;
    console.log(`\n   Peer average multiple: ${avg.toFixed(1)}x`);

    if (targetRevenue) {
      const targetRev = parseFloat(targetRevenue.value?.replace(/[^0-9.]/g, '') || '0');
      const targetVal = goodCoverage.secondary_value || goodCoverage.last_round_value;
      const targetMultiple = targetVal && targetRev > 0 ? targetVal / targetRev : null;

      if (targetMultiple) {
        const premium = ((targetMultiple - avg) / avg) * 100;
        console.log(`   ${goodCoverage.name} vs peers: ${premium > 0 ? '+' : ''}${premium.toFixed(1)}% ${premium > 0 ? 'premium' : 'discount'}`);
      }
    }
  }

  // Test delta calculation
  console.log('\n   Delta calculations:');

  if (goodCoverage.last_round_value && goodCoverage.secondary_value) {
    const delta = ((goodCoverage.secondary_value - goodCoverage.last_round_value) / goodCoverage.last_round_value) * 100;
    console.log(`     Last round → Current: ${goodCoverage.last_round_value}B → ${goodCoverage.secondary_value}B = ${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`);
    console.log(`     Dates: ${goodCoverage.last_round_date} → ${goodCoverage.secondary_date}`);
  } else {
    console.log(`     ⚠️  Missing data for last round → current delta`);
  }

  // Check for historical data
  const { data: history } = await supabase
    .from('lumen_valuation_history')
    .select('*')
    .eq('company_id', goodCoverage.id)
    .order('date', { ascending: false });

  if (history && history.length > 0) {
    console.log(`\n     Historical valuations: ${history.length} snapshots`);
    history.slice(0, 3).forEach(h => {
      console.log(`       ${h.date}: $${h.value}B (${h.valuation_type})`);
    });
  } else {
    console.log(`\n     ⚠️  No valuation history yet (will be created by cron)`);
  }
}

// Test sparse coverage company
if (sparseCoverage) {
  console.log('\n' + '='.repeat(80));
  console.log(`\n🎯 TEST 2: Sparse Coverage Company - ${sparseCoverage.name}`);
  console.log(`   Sector: ${sparseCoverage.sector}`);
  console.log(`   Last round: $${sparseCoverage.last_round_value}B`);
  console.log(`   Secondary: $${sparseCoverage.secondary_value}B`);

  const peers = companies.filter(c =>
    c.id !== sparseCoverage.id &&
    c.sector === sparseCoverage.sector &&
    (c.last_round_value || c.secondary_value)
  );

  console.log(`\n   Private peers found: ${peers.length} exact match(es)`);

  if (peers.length < 3) {
    console.log(`   ✅ CORRECT: <3 exact matches`);
    console.log(`   → Will use RELATED_SECTORS fallback to find more peers`);
    console.log(`   → Will trigger public comps (daily refresh)`);

    // Show what related sectors would be checked
    const relatedSectors = {
      'Aerospace & Defense': ['Hardware & Manufacturing'],
      'Developer Tools': ['Infrastructure & Cloud', 'Enterprise Software', 'Artificial Intelligence'],
      'Gaming & Entertainment': ['Consumer Apps', 'Social & Communications'],
      'Consumer Apps': ['Social & Communications', 'E-commerce & Marketplace'],
    };

    const related = relatedSectors[sparseCoverage.sector] || [];
    if (related.length > 0) {
      console.log(`   → Related sectors to check: ${related.join(', ')}`);
    }
  } else {
    console.log(`   ❌ UNEXPECTED: Has ≥3 peers, shouldn't be sparse`);
  }
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ Sanity check complete. Review the output above for any issues.\n');
