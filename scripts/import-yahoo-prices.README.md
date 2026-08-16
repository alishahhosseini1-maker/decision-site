# Yahoo Finance Bulk Import

Import price-per-share data from Yahoo Finance into Lumen.

## Quick Start

### 1. Copy Yahoo Finance Table

1. Go to https://finance.yahoo.com/markets/private-companies/highest-valuation/?start=0&count=150
2. Select the entire table (click on first row, scroll down, Shift+click last row)
3. **Copy** (Cmd+C / Ctrl+C)
4. Paste into a file: `yahoo-data.tsv`

### 2. Run the Import Script

**Preview (dry run):**
```bash
node scripts/import-yahoo-prices.mjs yahoo-data.tsv --dry-run
```

**Actually update:**
```bash
node scripts/import-yahoo-prices.mjs yahoo-data.tsv
```

## What It Does

1. **Parses** the Yahoo Finance table (TSV format from copy-paste)
2. **Matches** companies in your database by name (fuzzy matching)
3. **Updates** `secondary_price_per_share` and optionally `secondary_value`
4. **Reports** what changed

## Example Output

```
📊 Yahoo Finance Private Company Data Importer

Found 150 companies in Yahoo data
Found 3 companies in database

Matching companies...

════════════════════════════════════════════════════════════════════════════════
MATCHES FOUND:

✓ UPDATE  OpenAI
           Price: null → $721.85/share
           Valuation: 500.0B → 894.3B

✓ UPDATE  Anthropic
           Price: null → $589.01/share
           Valuation: null → 965.0B

  (no change)  Databricks

════════════════════════════════════════════════════════════════════════════════

Summary: 2/3 companies need updates

Applying updates...

✅ OpenAI
✅ Anthropic

✅ Updated 2 companies
```

## Fuzzy Matching

The script uses fuzzy matching to handle name variations:

- **OpenAI** ↔ OpenAI Inc
- **Databricks** ↔ Databricks, Inc.
- **Anthropic** ↔ Anthropic PBC

Match score must be ≥70% to update.

## Environment Variables

Required for direct database updates:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If not set, script generates SQL statements instead.

## Sample TSV Format

The Yahoo table copy-pastes as tab-separated values:

```
Symbol	Company	Price	52 Wk Change %	Estimated Valuation	Total Funding Raised	Latest Funding Date	Latest Amount Raised	Latest Round Share Class	Private Company Sector
OPAL.PVT	OpenAI	721.85	+80.12%	894.326B	178.07B	2026-03-30	68,209	Series C-NV	Artificial Intelligence
ANTH.PVT	Anthropic	589.01	+898.32%	965.001B	68.15B	2026-05-27	41.287B	Series H-1	Artificial Intelligence
```

## Manual SQL (No API)

If you don't have Supabase credentials set, the script generates SQL:

```sql
UPDATE lumen_companies
SET secondary_price_per_share = 721.85
  , secondary_value = 894.3
WHERE LOWER(name) LIKE LOWER('%OpenAI%');

UPDATE lumen_companies
SET secondary_price_per_share = 589.01
  , secondary_value = 965.0
WHERE LOWER(name) LIKE LOWER('%Anthropic%');
```

Copy-paste into Supabase SQL Editor and run.

## Troubleshooting

**"Could not read yahoo-data.tsv"**
- Make sure you pasted the table into a file
- Check the filename matches

**"No matches found"**
- Companies in Yahoo table don't exist in your database yet
- Add them first via "Add Company" button on the site

**"Match score too low"**
- The script requires ≥70% name similarity
- Check for typos or very different names
- Add manual SQL for edge cases
