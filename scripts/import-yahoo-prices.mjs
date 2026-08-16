#!/usr/bin/env node

/**
 * Bulk Import Yahoo Finance Private Company Data
 *
 * Usage:
 *   1. Go to https://finance.yahoo.com/markets/private-companies/highest-valuation/
 *   2. Copy the table (select all rows, Cmd+C)
 *   3. Paste into a file: yahoo-data.tsv
 *   4. Run: node scripts/import-yahoo-prices.mjs yahoo-data.tsv
 *
 * The script will:
 *   - Parse the TSV data
 *   - Match companies by name (fuzzy matching)
 *   - Generate SQL UPDATE statements
 *   - Or directly update via Supabase API (if SUPABASE_SERVICE_ROLE_KEY is set)
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const INPUT_FILE = process.argv[2] || 'yahoo-data.tsv';
const DRY_RUN = process.argv.includes('--dry-run');

// Parse Yahoo Finance table data (TSV format from copy-paste)
function parseYahooData(tsvContent) {
  const lines = tsvContent.trim().split('\n');
  const companies = [];

  for (const line of lines) {
    // Tab-separated: Symbol | Company | Price | Change% | Valuation | ...
    const cols = line.split('\t');

    if (cols.length < 5) continue; // Skip header or malformed rows

    const [symbol, name, priceStr, changeStr, valuationStr, ...rest] = cols;

    // Skip header row
    if (name === 'Company' || name === 'Symbol') continue;

    // Parse price (e.g., "721.85" or "$721.85")
    const price = parseFloat(priceStr.replace(/[$,]/g, ''));
    if (isNaN(price)) continue;

    // Parse valuation (e.g., "894.326B" or "$894B")
    let valuation = null;
    if (valuationStr) {
      const match = valuationStr.match(/([\d.]+)\s*([BMT])/i);
      if (match) {
        const num = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        valuation = unit === 'T' ? num * 1000 : unit === 'M' ? num / 1000 : num;
      }
    }

    companies.push({
      symbol: symbol.trim(),
      name: name.trim(),
      price,
      valuation,
      rawLine: line
    });
  }

  return companies;
}

// Fuzzy match company name (handles minor variations)
function fuzzyMatch(dbName, yahooName) {
  const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const db = normalize(dbName);
  const yahoo = normalize(yahooName);

  // Exact match after normalization
  if (db === yahoo) return 1.0;

  // One contains the other
  if (db.includes(yahoo) || yahoo.includes(db)) return 0.8;

  // Check if main words match (e.g., "OpenAI" vs "OpenAI Inc")
  const dbWords = db.split(/\s+/);
  const yahooWords = yahoo.split(/\s+/);
  const commonWords = dbWords.filter(w => yahooWords.includes(w));

  if (commonWords.length > 0) {
    return commonWords.length / Math.max(dbWords.length, yahooWords.length);
  }

  return 0;
}

async function main() {
  console.log('📊 Yahoo Finance Private Company Data Importer\n');

  // Read input file
  let tsvContent;
  try {
    tsvContent = readFileSync(INPUT_FILE, 'utf-8');
  } catch (err) {
    console.error(`❌ Could not read ${INPUT_FILE}`);
    console.error('   Copy the Yahoo Finance table and paste into a file, then run:');
    console.error(`   node scripts/import-yahoo-prices.mjs <filename>\n`);
    process.exit(1);
  }

  const yahooCompanies = parseYahooData(tsvContent);
  console.log(`Found ${yahooCompanies.length} companies in Yahoo data\n`);

  // Connect to Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('⚠️  Supabase credentials not found - generating SQL only\n');
    generateSQL(yahooCompanies);
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch existing companies from database
  const { data: dbCompanies, error } = await supabase
    .from('lumen_companies')
    .select('id, name, symbol, secondary_price_per_share, secondary_value');

  if (error) {
    console.error('❌ Failed to fetch companies:', error);
    process.exit(1);
  }

  console.log(`Found ${dbCompanies.length} companies in database\n`);
  console.log('Matching companies...\n');

  const updates = [];
  const matched = new Set();

  for (const yahoo of yahooCompanies) {
    let bestMatch = null;
    let bestScore = 0;

    for (const db of dbCompanies) {
      const score = fuzzyMatch(db.name, yahoo.name);
      if (score > bestScore && score >= 0.7) {
        bestScore = score;
        bestMatch = db;
      }
    }

    if (bestMatch) {
      matched.add(bestMatch.id);
      const needsUpdate =
        bestMatch.secondary_price_per_share !== yahoo.price ||
        (yahoo.valuation && bestMatch.secondary_value !== yahoo.valuation);

      updates.push({
        id: bestMatch.id,
        dbName: bestMatch.name,
        yahooName: yahoo.name,
        matchScore: bestScore,
        currentPrice: bestMatch.secondary_price_per_share,
        newPrice: yahoo.price,
        currentVal: bestMatch.secondary_value,
        newVal: yahoo.valuation,
        needsUpdate
      });
    }
  }

  // Print summary
  console.log('═'.repeat(80));
  console.log('MATCHES FOUND:\n');

  for (const u of updates) {
    const status = u.needsUpdate ? '✓ UPDATE' : '  (no change)';
    console.log(`${status}  ${u.dbName}`);
    if (u.dbName !== u.yahooName) {
      console.log(`           ↳ matched to: "${u.yahooName}" (${(u.matchScore * 100).toFixed(0)}%)`);
    }
    if (u.needsUpdate) {
      if (u.currentPrice !== u.newPrice) {
        console.log(`           Price: ${u.currentPrice || 'null'} → $${u.newPrice.toFixed(2)}/share`);
      }
      if (u.newVal && u.currentVal !== u.newVal) {
        console.log(`           Valuation: ${u.currentVal || 'null'}B → ${u.newVal}B`);
      }
    }
    console.log('');
  }

  const toUpdate = updates.filter(u => u.needsUpdate);
  console.log('═'.repeat(80));
  console.log(`\nSummary: ${toUpdate.length}/${updates.length} companies need updates\n`);

  if (DRY_RUN || toUpdate.length === 0) {
    console.log('Dry run - no changes made.');
    if (toUpdate.length > 0) {
      console.log('Run without --dry-run to apply updates.');
    }
    return;
  }

  // Apply updates
  console.log('Applying updates...\n');
  let success = 0;
  let failed = 0;

  for (const u of toUpdate) {
    const { error } = await supabase
      .from('lumen_companies')
      .update({
        secondary_price_per_share: u.newPrice,
        ...(u.newVal ? { secondary_value: u.newVal } : {})
      })
      .eq('id', u.id);

    if (error) {
      console.error(`❌ ${u.dbName}: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ ${u.dbName}`);
      success++;
    }
  }

  console.log(`\n✅ Updated ${success} companies`);
  if (failed > 0) {
    console.log(`❌ Failed ${failed} companies`);
  }
}

function generateSQL(yahooCompanies) {
  console.log('-- SQL UPDATE statements for manual execution\n');
  console.log('-- Run this in Supabase SQL Editor:\n');

  for (const company of yahooCompanies.slice(0, 20)) { // Top 20
    const name = company.name.replace(/'/g, "''"); // Escape quotes
    const price = company.price.toFixed(2);
    const valuation = company.valuation ? company.valuation.toFixed(1) : null;

    console.log(`UPDATE lumen_companies`);
    console.log(`SET secondary_price_per_share = ${price}`);
    if (valuation) {
      console.log(`  , secondary_value = ${valuation}`);
    }
    console.log(`WHERE LOWER(name) LIKE LOWER('%${name}%');`);
    console.log('');
  }

  console.log(`-- (Showing top 20 of ${yahooCompanies.length} companies)`);
}

main().catch(console.error);
