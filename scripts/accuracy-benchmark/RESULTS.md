# Accuracy Benchmark Results - August 2026

## Summary

**Tier 2 (Less-Famous Companies):** Moderate accuracy (60% pass, 23.6% mean error)  
**Tier 1 (Famous Companies):** Failed sanity check (33% pass, 99.6% mean error)

**Status:** Pipeline shows promise but needs expanded test set before claiming validation.

**Note:** Results corrected after parser bug fix (Aug 2026) - see "Parser Bug Impact" section below.

---

## Final Results (Corrected)

### Tier 2: Less-Famous Companies (n=5)

| Company | Actual | Estimate | Error | Status |
|---------|--------|----------|-------|--------|
| Plaid | $13.4B | $13.4B | 0.0% | ✅ PASS |
| Anduril | $14.0B | $18.5B | 32.1% over | ❌ FAIL |
| Notion | $10.0B | $6.0B | 40.0% under | ✅ PASS |
| Faire | $12.6B | $7.0B | 44.4% under | ❌ FAIL |
| Rippling | $11.25B | $11.5B | 2.2% over | ✅ PASS |

**Metrics:**
- Mean error: 23.6% (threshold: 40%)
- Median error: 32.1%
- Pass rate: 60% (3/5)
- Bias: Balanced (2 under, 2 over, 1 perfect)

### Tier 1: Famous Companies (n=3)

| Company | Actual | Estimate | Error | Status |
|---------|--------|----------|-------|--------|
| Anthropic | $60B | $200B | 233.3% over | ❌ FAIL |
| OpenAI | $157B | $260B | 65.6% over | ❌ FAIL |
| Stripe | $65B | $65B | 0.0% | ✅ PASS |

**Metrics:**
- Mean error: 99.6% (threshold: 30%)
- Median error: 65.6%
- Pass rate: 33%
- Pattern: AI companies massively overestimated, fintech perfect

---

## Critical Findings

### 1. Parser Bug (Fixed Aug 2026)

**Impact:** Valuation parser only handled billions, not millions - affected all Series A/B companies.

**Original (buggy) Tier 2 results:**
- Plaid: $12.0B (10.4% under) - now $13.4B (0% error) ✓
- Anduril: $14.0B (0% error) - now $18.5B (32% over) ✗
- Notion: $6.0B (40% under) - unchanged
- Faire: $6.0B (52.4% under) - now $7.0B (44% under)
- Rippling: $13.5B (20% over) - now $11.5B (2.2% over) ✓
- **Original metrics: 80% pass, 24.6% mean error**

**Corrected results (above):**
- Parser now captures millions-denominated valuations ($60M → 0.06B)
- 22 previously-NULL valuations recovered across database
- Anduril's "0% perfect" was artifact of missing Seed data, not genuine success
- **Corrected metrics: 60% pass, 23.6% mean error**

**Conclusion:** Parser bug affected individual estimates but overall accuracy level similar (~24% mean error).

### 2. Data Integrity Issues (Now Fixed)

**Metadata Filter Bug:**
- Company metadata fields (`last_round_value`, `last_round_date`, `secondary_value`, `secondary_date`) were not filtered by `asOf` parameter
- Only evidence array was filtered, allowing post-cutoff data to leak through company metadata
- Impact: 4 of 5 Tier 2 companies were contaminated in initial run

**Undated Secondary Values:**
- Rippling and Anduril had `secondary_value` without `secondary_date`
- Undated current market prices can't be filtered by date
- Created unfilterable data leaks

**Boundary Condition:**
- Changed from `>` to `>=` comparison (strictly before cutoff, not at-or-before)
- Cutoff date is the date of the known price we're predicting, so should be excluded

### 2. "Secondary Weighting Bug" Was Actually Data Leaks

**Initial Hypothesis (VOID):**
- Rippling: Secondary $18.9B pulled estimate to $16.5B (46.7% over)
- Anduril: Secondary $115B pulled estimate to $95B (578.6% over!)
- AI reasoning said "secondary less reliable" but still heavily weighted it

**Actual Cause:**
- Both secondary values were undated (NULL secondary_date)
- These were current market prices leaking through, not pre-cutoff signals
- After fixing metadata filter:
  - Rippling: 20.0% over (reasonable)
  - Anduril: 0.0% perfect!

**Conclusion:** No secondary-vs-primary weighting bug exists. All massive overestimates were caused by data leaks.

### 3. AI Sector Overestimates (Tier 1)

**Pattern:**
- Anthropic: 233.3% over
- OpenAI: 65.6% over
- Stripe (fintech): 0.0% perfect

**Possible Causes:**
1. Training data contamination (model "knows" inflated AI valuations)
2. AI hype in evidence sources (news/research overstates AI company values)
3. Sector-specific bias

**Needs Investigation:** Pull evidence/key-drivers for Anthropic and OpenAI to determine if overestimates come from contaminated training data or hyped evidence sources.

---

## Interpretation

### What This Proves

✅ **Pipeline is not fundamentally broken** - Tier 2 shows reasonable accuracy  
✅ **Evidence gathering works** - Perplexity + Crunchbase produces usable data  
✅ **AI valuation logic is directionally correct** - 4 of 5 within 40% error  
✅ **Date filtering works** (after fix) - Non-destructive asOf parameter filters correctly

### What This Doesn't Prove Yet

❌ **Validation at scale** - n=5 is too small for statistical confidence  
❌ **Works on target market** - These are still well-covered unicorns, not thin-coverage Series A  
❌ **AI sector accuracy** - Tier 1 AI overestimates are concerning  
❌ **Consistency** - Notion at threshold, Faire fails both runs

### Conservative Framing

*"Clean pipeline shows **encouraging accuracy** (Tier 2: 80% pass, 24.6% mean error) but **warrants expanding the test set** before claiming validation. n=5 less-famous companies suggests the core mechanism works, but AI sector overestimates (Tier 1) and two threshold-level results (Notion 40%, Faire fail) indicate the benchmark needs more companies to establish statistical confidence."*

---

## Next Steps

### Immediate (Before Claiming Validation)

1. **Investigate Tier 1 AI overestimates**
   - Pull evidence/key-drivers for Anthropic and OpenAI
   - Determine if training data contamination or hyped sources
   - If training data: this is a blocker for AI company valuations
   - If hyped sources: need to discount AI sector evidence more heavily

2. **Expand Tier 2 to n=15-20**
   - Add genuinely thin-coverage Series A companies (current test set is still well-covered unicorns)
   - Spread across more sectors to detect uneven accuracy
   - Include more recent rounds (2024-2025) to test on fresher data

### Future Enhancements

3. **Add evidence quality metrics**
   - Track how many evidence items per company
   - Measure credibility distribution (verified vs pending)
   - Correlate evidence density with accuracy

4. **Sector-specific calibration**
   - If AI sector consistently overestimates, add sector-specific discounts
   - Test if fintech/defense/SaaS have different accuracy profiles

5. **Re-run periodically**
   - Detect regressions as pipeline evolves
   - Build confidence with repeated accurate predictions

---

## Data Integrity Fixes Applied

### Metadata Filter (valuation.ts)

```typescript
// When asOf is set, null out metadata fields with dates >= cutoff
const company = options?.asOf ? {
  ...cleanCompany,
  last_round_value: (cleanCompany.last_round_date && cleanCompany.last_round_date >= options.asOf) ? null : cleanCompany.last_round_value,
  last_round_date: (cleanCompany.last_round_date && cleanCompany.last_round_date >= options.asOf) ? null : cleanCompany.last_round_date,
  secondary_value: (cleanCompany.secondary_date && cleanCompany.secondary_date >= options.asOf) ? null : cleanCompany.secondary_value,
  secondary_date: (cleanCompany.secondary_date && cleanCompany.secondary_date >= options.asOf) ? null : cleanCompany.secondary_date,
} : cleanCompany;
```

### Undated Secondary Value Validation

```typescript
// Null out secondary_value if no secondary_date (can't be filtered by date)
const cleanCompany = {
  ...companyRaw,
  secondary_value: (companyRaw.secondary_value && !companyRaw.secondary_date) ? null : companyRaw.secondary_value,
  secondary_date: (companyRaw.secondary_value && !companyRaw.secondary_date) ? null : companyRaw.secondary_date,
};
```

### Boundary Condition

```typescript
// Changed from > to >= (strictly before cutoff)
if (e.date >= options.asOf) {
  return false; // Exclude evidence at or after cutoff
}
```

---

## Lessons Learned

1. **Data integrity > everything** - One metadata leak contaminated an entire benchmark batch
2. **Verify assumptions** - "Weighting bug" was actually data leaks
3. **Date filtering is subtle** - Boundary conditions (>= vs >) matter
4. **Undated data is toxic** - Can't filter what doesn't have a date
5. **n=5 is not validation** - Need larger sample for statistical confidence
6. **Famous ≠ easier** - Tier 1 failed worse than Tier 2 (training data risk is real)

---

## Files

- `test-companies.json` - 8 companies with known price points and estimates
- `score-benchmark.mjs` - Scoring script (handles 2-tier structure)
- `run-valuation.mjs` - Helper to run valuations with asOf filter
- `README.md` - Instructions
- `RESULTS.md` - This file
