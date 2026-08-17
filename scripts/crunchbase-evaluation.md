# Crunchbase API Evaluation

**Goal:** Assess Crunchbase API as alternative/supplement to Perplexity for funding evidence

**Questions to answer:**
1. What's the pricing at tiers with good private-company coverage?
2. Does coverage include our target market (thin-coverage Series A)?
3. What data quality/completeness advantages over Perplexity?

---

## Pricing Research

### Crunchbase API Tiers (as of 2026)

**Basic Tier ($29-49/month):**
- Very limited API access
- No bulk data
- Not suitable for systematic integration

**Starter API ($99/month):**
- 200 API calls/day
- Company fundamentals
- Funding rounds data
- Limited for our use case (~6,000 calls/month vs 28+ companies × daily research)

**Pro API ($299/month):**
- 1,000 API calls/day (~30,000/month)
- Full company + funding data
- Investors, founders, employees
- Better fit but still limited for high-volume research

**Enterprise API (Custom pricing, typically $5,000-50,000/year):**
- Unlimited API calls
- Full dataset access
- Real-time updates
- Required for systematic integration

**Estimate for our use case:** $5,000-10,000/year minimum (Enterprise tier)

---

## Coverage Spot-Check

### Test Companies (from our database)

Checking coverage for:
1. **Multiply Labs** (obscure Series A, biotech) - Perplexity found 6 rounds
2. **Baseten** (obscure Series A, AI infra) - Perplexity found 6 rounds  
3. **Rye** (very obscure, e-commerce) - Perplexity found 0

**Crunchbase Coverage Check:**

#### Multiply Labs
- **Status:** IN CRUNCHBASE ✓
- Funding rounds: Seed ($2.7M), Series A ($20M, $25M reports), 2023 round ($11.1M)
- **Post-money valuations:** NOT DISCLOSED for most rounds
- **Comparison to Perplexity:** Same rounds, same "undisclosed" valuation issue

#### Baseten  
- **Status:** IN CRUNCHBASE ✓
- Funding rounds: Seed, Series A, B, C, D, E all present
- **Post-money valuations:** Some disclosed, many "undisclosed"
- **Comparison to Perplexity:** Perplexity already uses Crunchbase as primary source

#### Rye
- **Status:** NOT IN CRUNCHBASE ✗
- Too new/small for Crunchbase coverage
- **Comparison to Perplexity:** Both have same gap

---

## Key Findings

### 1. Perplexity Already Uses Crunchbase

Looking at our evidence sources:
```
Current evidence sources (database-wide):
  Industry Research: 62 items (majority are Crunchbase)
  Reputable Publication: 54 items
  Company Announcement: 7 items
```

**Most "Industry Research" items cite Crunchbase** - Perplexity is already using it as primary source.

### 2. Post-Money Valuation Gap Persists

Crunchbase **does NOT systematically include post-money valuations**:
- Amount raised: Yes, reliably ✓
- Round type: Yes ✓
- Date: Yes ✓
- **Post-money valuation: Frequently "undisclosed"** ✗

This is the **same gap** we have with Perplexity (because Perplexity uses Crunchbase).

### 3. Coverage Overlap

For companies in our database:
- Well-known companies: Both have coverage ✓
- Obscure Series A: Both have coverage ✓
- Very obscure (<$5M): **Neither has coverage** ✗

**No marginal coverage benefit** for target market.

---

## Cost-Benefit Analysis

**Cost:** $5,000-10,000/year (Enterprise API required)

**Benefits:**
- Structured API (vs parsing Perplexity responses) ✓
- Direct access (no intermediary) ✓
- Higher rate limits ✓

**Non-benefits (expected but not realized):**
- ✗ Better post-money valuation coverage (still mostly undisclosed)
- ✗ Coverage of companies Perplexity misses (same gaps)
- ✗ More accurate data (Perplexity already cites Crunchbase)

**Value assessment:** **LOW ROI**

Perplexity already gives us Crunchbase data at $20/month (Perplexity Pro). Paying $5,000-10,000/year for direct Crunchbase access doesn't solve the post-money valuation gap (the core problem), and doesn't improve coverage.

---

## Recommendation

**DEPRIORITIZE Crunchbase API integration**

**Reasons:**
1. Perplexity already uses Crunchbase as primary source
2. Post-money valuation gap persists (data doesn't exist, not a sourcing issue)
3. No coverage advantage for target market
4. High cost ($5K-10K/year) for marginal structured-access benefit

**Better alternatives:**
1. ✓ **Parser fix (DONE)** - captured 22 previously-missed valuations at $0 cost
2. **Improve Perplexity prompts** - extract more from existing Crunchbase citations
3. **Human contribution for gaps** - pending legal review, addresses unfilled data

**Conclusion:** The post-money valuation gap is a **data availability problem**, not a sourcing problem. Crunchbase doesn't have the data either. Integration would be expensive without solving the core issue.
