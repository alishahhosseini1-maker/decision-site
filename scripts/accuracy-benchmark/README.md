# Lumen Accuracy Benchmark

**Goal:** Measure whether Lumen's AI-assisted valuation produces estimates that are meaningfully close to real, verifiable private-company price points.

---

## Process

### Step 1: Build the Test Set (Manual)

Find 20 private companies with **verifiable recent price points**:

**Sources:**
- Recent funding rounds (TechCrunch, SEC Form D, press releases)
- Secondary trade prices (Forge, EquityZen public data)
- 409A valuations (rare but sometimes disclosed)
- IPO/acquisition announcements

**Target mix:**
- **Sectors:** AI (3), Fintech (3), Enterprise SaaS (3), Consumer (3), Other (8)
- **Stages:** Seed (3), Series A-B (5), Series C-D (7), Late-stage (5)
- **Coverage:** Well-covered (10), Thin coverage (10)

**For each company, record in `test-companies.json`:**
- Company name
- Sector and stage
- Known price point (valuation, date, source URL, type)

**Critical:** Record the date of the known price point. In Step 2, we'll only use evidence BEFORE that date.

---

### Step 2: Run Lumen's Pipeline (Manual)

For each of the 20 companies:

1. **Add the company to Lumen** (if not already present)
2. **Gather evidence** - use only evidence dated BEFORE the known price point date
   - Option A: Manual submission (if testing human workflow)
   - Option B: AI research (if testing AI pipeline) - but filter results by date
3. **Run valuation** - click "Run valuation" to get AI estimate
4. **Record in `test-companies.json`:**
   - `lumen_estimate.valuation_billions`
   - `lumen_estimate.confidence_score`
   - `lumen_estimate.evidence_count`
   - `lumen_estimate.evidence_avg_credibility`
   - `lumen_estimate.run_date`

**Why filter by date?**  
To prevent the AI from "seeing the answer." If we use evidence published AFTER the known price point, the model might directly cite the round announcement, which would artificially inflate accuracy.

---

### Step 3: Score It (Automated)

Run the scoring script:

```bash
node score-benchmark.mjs test-companies.json
```

**Outputs:**
- Overall accuracy (median/mean error %)
- Error distribution (% within 10%, 25%, 50%)
- Segmentation by sector, stage, evidence density
- Worst/best performers
- Pattern detection (systematic bias, evidence quality correlation)
- Recommendations

---

### Step 4: Report (Manual Analysis)

**Write up:**

1. **Overall accuracy** - headline number and interpretation
2. **Where it's strong** - which sectors/stages/coverage levels work well
3. **Where it's weak** - where errors are highest
4. **Hypothesis for each weak spot** - e.g.:
   - "Errors >50% for pre-seed companies - likely due to corroboration logic requiring 2+ sources within 45 days, which thin-coverage companies rarely have"
   - "Systematic overestimation for AI companies - may be overfitting to recent hype cycle in training data"
5. **Systematic biases** - does it consistently over/underestimate?

---

## Example Test Case

```json
{
  "id": 1,
  "name": "Anthropic",
  "sector": "AI",
  "stage": "series_c_d",
  "known_price_point": {
    "valuation_billions": 18.4,
    "date": "2024-05-31",
    "source": "TechCrunch - Series C",
    "source_url": "https://techcrunch.com/...",
    "type": "funding_round"
  },
  "lumen_estimate": {
    "valuation_billions": 16.2,
    "confidence_score": 72,
    "evidence_count": 8,
    "evidence_avg_credibility": 75,
    "run_date": "2026-08-16",
    "notes": "Used 8 evidence items from 2023-2024, excluded post-May-2024 announcements"
  },
  "analysis": {
    "error_pct": 11.9,
    "error_absolute": 2.2,
    "within_confidence_range": true,
    "notes": "Strong accuracy - 8 high-credibility sources, well-corroborated"
  }
}
```

---

## Success Criteria

**What counts as "meaningfully accurate"?**

- **Median error <25%:** Useful for directional estimates
- **Median error <10%:** Competitive with professional tools
- **No systematic bias:** Over/underestimation split roughly 50/50

**Failure modes to watch for:**
- High variance (some very accurate, some wildly wrong)
- Systematic bias (always overestimates)
- Evidence-density cliff (accurate with >10 sources, useless with <5)
- Stage/sector blind spots (e.g., only works for late-stage SaaS)

---

## Files

- `test-companies.json` - Test set and results (editable by hand)
- `score-benchmark.mjs` - Analysis script (run after filling in data)
- `README.md` - This file

---

## Notes

- This is a **measurement task**, not a feature build
- **Don't let the AI see the answer** - filter evidence by date
- **Pattern matters more than headline number** - we need to know WHERE it breaks
- **Ship the disclaimer first** - already done in `app/page.tsx`
