# Lumen 2-Tier Accuracy Benchmark

## What This Is

A validation framework that tests whether Lumen's evidence-gathering + AI valuation pipeline actually works by comparing AI estimates against known real price points.

**This is the one test that tells you whether the core mechanism works before investing more in strategy, GTM, or features.**

---

## Why 2 Tiers?

**Tier 1 (Famous Companies - 3 total):**
- Well-known companies (Anthropic, OpenAI, Stripe)
- Extensive press coverage
- **Purpose:** Sanity check only
- **Risk:** Training data contamination - the model might already "know" the answer
- **Interpretation:** Good score is necessary but not sufficient

**Tier 2 (Less-Famous Companies - 5 total):**
- Companies with verifiable price points but less coverage  
- Spread across sectors and stages
- **Purpose:** Real validation signal
- **Why:** Less risk of training data contamination
- **Interpretation:** This is what actually proves the pipeline works

**Key:** Score the two tiers separately. Blending them hides whether you're measuring the pipeline or just measuring training data.

---

## Test Set

### Tier 1 (Famous)
1. **Anthropic** - AI, Late-stage, $60B target (Dec 2025)
2. **OpenAI** - AI, Late-stage, $157B target (Oct 2024)
3. **Stripe** - Fintech, Late-stage, $65B target (Feb 2024)

### Tier 2 (Less-Famous) - THE REAL TEST
1. **Plaid** - Fintech, Series D, $13.4B target (Apr 2021)
2. **Anduril** - Defense Tech, Series F, $14B target (Aug 2024)
3. **Notion** - Enterprise SaaS, Series C, $10B target (Oct 2021)
4. **Faire** - Marketplace, Series G, $12.6B target (Nov 2021)
5. **Rippling** - HR Tech, Series D, $11.25B target (May 2023)

---

## Running the Benchmark

### Step 1: Run Valuations

For each company in `test-companies.json`:

1. **Ensure company exists** in Lumen database
2. **Filter evidence by date** - delete any evidence dated AFTER the known price point cutoff date
   - This prevents the AI from "cheating" by reading the answer
   - Example: For OpenAI's $157B round on Oct 4, 2024, delete all evidence after that date
3. **Trigger AI valuation** - either via UI or API
4. **Record the estimate** in `test-companies.json` under `lumen_estimate`:
   ```json
   "lumen_estimate": {
     "valuation_billions": 58.5,
     "confidence_score": 72,
     "evidence_count": 8,
     "run_date": "2026-08-16",
     "notes": "Filtered to pre-Oct-2024 evidence"
   }
   ```

**Critical:** Be strict about the evidence cutoff. Using post-cutoff evidence contaminates the test.

### Step 2: Score Results

```bash
node score-benchmark.mjs test-companies.json
```

**Output:**
- Tier 1 score (sanity check)  
- Tier 2 score (real validation)
- Error distribution
- Sector breakdown
- Bias detection
- Recommendations

### Step 3: Interpret

**Tier 1 (Famous):**
- >30% mean error = 🔴 Pipeline has major issues
- ≤30% mean error = ✅ Sanity check passed (but doesn't prove pipeline works)

**Tier 2 (Less-Famous) - THE REAL TEST:**
- >60% mean error = 🔴 **CRITICAL** - Pipeline doesn't work, fix core logic
- 40-60% mean error = ⚠️ **MARGINAL** - Needs improvement, rough estimates only
- 25-40% mean error = ✅ **ACCEPTABLE** - Reasonable for crowdsourced data, pipeline validated
- <25% mean error = 🎯 **EXCELLENT** - Competitive accuracy, strong foundation

---

## What This Proves (Or Doesn't)

**If Tier 2 passes (≤40% mean error):**
- ✅ Evidence gathering works
- ✅ AI valuation logic is reasonable
- ✅ Pipeline validated for less-covered companies
- ✅ Foundation exists for wedge strategy
- ➡️ **Safe to proceed with GTM decisions**

**If Tier 1 passes but Tier 2 fails:**
- ❌ Pipeline might be "cheating" with training data
- ❌ Doesn't generalize to less-known companies
- ❌ Not ready for production
- ➡️ **Fix evidence gathering or valuation logic**

**If both tiers fail:**
- 🔴 Core mechanism broken
- ➡️ **Fundamental revision needed before proceeding**

---

## Example Workflow

```bash
# 1. Check current test data
cat test-companies.json | jq '.tiers.tier2_less_famous.companies[] | .name'

# 2. For each company, run valuation (manual step via UI or API)
# - Visit company page
# - Delete evidence after cutoff date
# - Run AI valuation
# - Record estimate in JSON

# 3. Score when done
node score-benchmark.mjs test-companies.json

# 4. If Tier 2 passes, proceed to wedge selection
# If Tier 2 fails, debug and fix pipeline first
```

---

## Next Steps After Running

1. **If Tier 2 passes:** Run the wedge community selection (which vertical/stage to target first)
2. **If Tier 2 is marginal:** Investigate which sectors underperform, improve evidence density
3. **If Tier 2 fails:** Debug why (bias? evidence quality? valuation logic?)

---

## Files

- `test-companies.json` - Test set with known price points and Lumen estimates
- `score-benchmark.mjs` - Scoring script (handles 2-tier structure)
- `README.md` - This file

---

## Notes

- **Don't contaminate:** Companies in test set should NOT be used for training or tuning the AI model
- **Be strict:** Evidence cutoff dates matter - one leaked post-cutoff announcement ruins the test
- **Re-run periodically:** As the pipeline evolves, re-run to detect regressions
- **Tier 2 is what matters:** Tier 1 is just a sanity check
