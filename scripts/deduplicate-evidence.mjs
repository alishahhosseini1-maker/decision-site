#!/usr/bin/env node
/**
 * Deduplicate evidence: remove duplicate funding/secondary evidence items
 * that represent the same underlying event (same company, category, date, value).
 *
 * Root cause: researchCompanyEvidence() was inserting blindly without checking
 * for existing equivalent evidence. Fixed in app/lib/perplexity.ts.
 *
 * This script cleans up existing duplicates across all companies.
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = {};
readFileSync('.env.local', 'utf-8').split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1]] = match[2];
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

// Helper: normalize value for comparison (extract numbers only)
function normalizeValue(val) {
  if (!val) return null;
  return val.toUpperCase().replace(/[^0-9.]/g, '');
}

// Helper: check if two evidence items are duplicates
function areDuplicates(a, b) {
  // Same category
  if (a.category !== b.category) return false;

  // Similar dates (within 7 days)
  if (a.date && b.date) {
    const daysDiff = Math.abs(
      (new Date(a.date).getTime() - new Date(b.date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysDiff > 7) return false;
  }

  // Similar values (within 5%)
  if (a.value && b.value) {
    const aVal = parseFloat(normalizeValue(a.value));
    const bVal = parseFloat(normalizeValue(b.value));
    if (!isNaN(aVal) && !isNaN(bVal)) {
      const diff = Math.abs(aVal - bVal);
      const avg = (aVal + bVal) / 2;
      if (diff / avg > 0.05) return false;
    }
  }

  return true;
}

// Helper: pick which duplicate to keep (prefer verified > pending, Reputable Publication > Industry Research)
function pickBest(group) {
  // Sort by status (verified first), then source_type credibility
  const sourceRank = {
    'SEC / Government Filing': 5,
    'Company Announcement': 4,
    'Reputable Publication': 3,
    'Industry Research': 2,
    'Social Media': 1,
    'Unattributed': 0,
  };

  const sorted = group.sort((a, b) => {
    // Verified before pending
    if (a.status === 'verified' && b.status !== 'verified') return -1;
    if (b.status === 'verified' && a.status !== 'verified') return 1;

    // Higher credibility source first
    const aRank = sourceRank[a.source_type] ?? 0;
    const bRank = sourceRank[b.source_type] ?? 0;
    if (aRank !== bRank) return bRank - aRank;

    // Older created_at first (original wins)
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  return sorted[0];
}

async function deduplicateCompany(company) {
  const { data: evidence } = await supabase
    .from('lumen_evidence')
    .select('*')
    .eq('company_id', company.id)
    .in('category', ['Funding', 'Secondary'])
    .order('date', { ascending: false });

  if (!evidence || evidence.length === 0) return { company: company.name, duplicates: 0, kept: 0 };

  // Group duplicates
  const groups = [];
  const processed = new Set();

  for (const item of evidence) {
    if (processed.has(item.id)) continue;

    const duplicates = [item];
    processed.add(item.id);

    for (const other of evidence) {
      if (processed.has(other.id)) continue;
      if (areDuplicates(item, other)) {
        duplicates.push(other);
        processed.add(other.id);
      }
    }

    if (duplicates.length > 1) {
      groups.push(duplicates);
    }
  }

  if (groups.length === 0) {
    return { company: company.name, duplicates: 0, kept: 0 };
  }

  // For each group, keep the best one and delete the rest
  let totalDuplicates = 0;
  let totalKept = 0;

  for (const group of groups) {
    const best = pickBest(group);
    const toDelete = group.filter(e => e.id !== best.id).map(e => e.id);

    console.log(`\n${company.name} — ${best.category} (${best.date}):`);
    console.log(`  Found ${group.length} duplicates for "${best.value}"`);
    console.log(`  Keeping: ${best.status} — ${best.source_type} (ID: ${best.id})`);
    console.log(`  Deleting: ${toDelete.length} duplicate(s)`);

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from('lumen_evidence')
        .delete()
        .in('id', toDelete);

      if (error) {
        console.log(`  ERROR deleting:`, error);
      } else {
        totalDuplicates += toDelete.length;
        totalKept += 1;
      }
    }
  }

  return { company: company.name, duplicates: totalDuplicates, kept: totalKept };
}

async function main() {
  console.log('EVIDENCE DEDUPLICATION');
  console.log('='.repeat(80));
  console.log();

  // Get all companies
  const { data: companies } = await supabase
    .from('lumen_companies')
    .select('id, name')
    .order('name');

  if (!companies || companies.length === 0) {
    console.log('No companies found.');
    return;
  }

  console.log(`Checking ${companies.length} companies for duplicate evidence...\n`);

  const results = [];
  for (const company of companies) {
    const result = await deduplicateCompany(company);
    if (result.duplicates > 0) {
      results.push(result);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));

  if (results.length === 0) {
    console.log('No duplicates found across any companies.');
  } else {
    const totalDuplicates = results.reduce((sum, r) => sum + r.duplicates, 0);
    const totalKept = results.reduce((sum, r) => sum + r.kept, 0);

    console.log(`\nCleaned up ${totalDuplicates} duplicate evidence items across ${results.length} companies.`);
    console.log(`Kept ${totalKept} best-quality records.\n`);

    console.log('Companies affected:');
    results.forEach(r => {
      console.log(`  - ${r.company}: removed ${r.duplicates}, kept ${r.kept}`);
    });
  }

  console.log('\n✓ Deduplication complete.');
}

main().catch(console.error);
