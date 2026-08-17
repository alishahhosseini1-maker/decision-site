# Accuracy Benchmark Session Summary - August 2026

**Quick Reference:** Everything you need to pick this work back up without re-reading the full session.

---

## Current State

### Benchmark Results (Corrected)

**Tier 2 (Less-Famous Companies): 60% pass, 23.6% mean error**
- Plaid: $13.4B estimate (0% error) ✓ PERFECT
- Anduril: $18.5B estimate (32% over) ✗ FAIL
- Notion: $6.0B estimate (40% under) ✓ PASS
- Faire: $7.0B estimate (44% under) ✗ FAIL
- Rippling: $11.5B estimate (2.2% over) ✓ PASS

**Tier 1 (Famous Companies): 33% pass, 99.6% mean error** (failed sanity check)

**Why results changed from 80%/24.6%:**
Parser bug only handled billions, not millions → missed all Series A/B valuations <$1B. Fixed parser recovered 22 valuations. Anduril's "0% perfect showcase" was artifact of missing Seed data.

### Database State

**Total companies:** 28
- **With evidence:** 25 companies (89%)
- **Zero evidence:** 3 companies (11%) - Rye, Skild AI, Epic Games (legitimately too obscure)

**Funding evidence completeness:** 91% have valuations (162/179 items)
- **Before parser fix:** Much lower (many NULL values)
- **After parser fix:** 22 previously-NULL valuations recovered

**Evidence gaps identified:**
- 7 companies with stale funding (>20 months old)
- 10 companies with no momentum evidence (Revenue, Headcount, etc.)
- 6 companies with BOTH stale + no momentum (highest risk)

---

## Open Items (Priority Order)

### 1. Legal Review — GATING ITEM

**Blocks:** Human contribution flow for funding/momentum data

**Context:** 
- Public sourcing exhausted (Perplexity, Crunchbase, Form D all deprioritized)
- Post-money valuation gap is **data availability problem**, not sourcing problem
- Human contribution is only remaining path to fill gaps

**What needs review:**
- Soliciting non-public financial data from insiders (employees, investors)
- Contract/NDA breach risks
- Securities law considerations (even for "research purposes")

**Scoping:**
- Funding round data: Likely lower-risk but needs confirmation
- Revenue/contract data: Higher-risk, explicitly flagged in session
- Decision: Hold ALL human contribution (even funding) until review complete

**Next step:** Get legal review before building contribution flow

### 2. Isolated Test Sandbox — NEEDED BEFORE NEXT BENCHMARK

**Status:** NOT BUILT

**Why needed:**
Two production-touching mistakes this session:
1. Fabricated test data added to live database (caught and removed)
2. Deletion instinct that could have affected production

**What's needed:**
- Separate test database OR clearly-marked test data workflow
- Prevents test/benchmark work from contaminating production
- Makes experiments reversible without risk

**Next step:** Set up isolated sandbox before n=15-20 expansion or future testing

### 3. Expanded n=15-20 Thin-Coverage Benchmark — READY TO RUN

**Status:** Paused pending sourcing findings, now UNBLOCKED

**Why paused:**
- Needed to determine if sourcing gaps could be filled
- Wanted to avoid rediscovering same issues across 15 companies

**Why unblocked:**
- Parser fix addressed (captured 22 valuations at $0 cost)
- Alternative sources evaluated and deprioritized (Form D, Crunchbase)
- Known limitations documented and understood

**Recommendations before running:**
1. Build isolated test sandbox first (item #2)
2. Track evidence staleness as explicit variable (bucket by age)
3. Include genuinely thin-coverage Series A (not just famous unicorns)
4. Expect similar limitations: funding-only evidence, some undisclosed valuations

**Expected value:**
- Statistical confidence (n=5 too small)
- Staleness correlation validation at scale
- Coverage pattern detection across sectors

---

## Known Limitations (Keep In Mind)

### 1. Companies With No Public Evidence
- **Rye, Skild AI, Epic Games** (3 companies, 11% of database)
- Too obscure for Perplexity/Crunchbase
- Form D doesn't help (not in SEC database)
- **Cannot be fixed via public sources**
- Human contribution or acceptance required

### 2. Momentum Evidence Gap for Obscure Companies
- **Finding:** Obscure Series A companies get funding-only evidence
- **Test:** Baseten, Multiply Labs had ZERO momentum (Revenue, Headcount, Contracts)
- **Root cause:** Web sources don't publish revenue/headcount for small private companies
- **Comparison:** Well-known companies (Anthropic) have rich momentum evidence
- **Impact:** Valuations anchor to stale funding rounds without growth signals
- **Cannot be fixed via public sources** (data doesn't exist publicly)

### 3. Incomplete Funding Data (Multiply Labs Case)
- **Example:** Multiply Labs has 6 funding rounds, only 1 with post-money valuation
- **Pattern:** Crunchbase shows "Amount raised: $20M, Valuation: Undisclosed"
- **Finding:** This is NOT a sourcing gap - data genuinely undisclosed
- **Perplexity already uses Crunchbase** as primary source
- **Crunchbase direct API** doesn't solve this ($5K-10K/year for same gaps)
- **Cannot be fixed via public sources** (companies don't disclose)

### 4. Staleness-Driven Estimation Errors
- **Pattern identified:** Staleness + growth trajectory → overestimation
- **Example:** Anduril 20-month stale evidence → 32% overestimate
- **Mitigation implemented:** Staleness flagging in valuation prompt
- **Limitation:** Can warn about staleness, can't eliminate it
- **Trade-off:** Conservative estimates vs accepting staleness

---

## What Was Fixed This Session

### 1. Parser Bug (CRITICAL)
**Before:** Only parsed billions ($1B), missed millions ($60M)
**After:** Handles both M and B, converts to billions (0.06)
**Impact:** 22 valuations recovered, 91% database completeness
**Files:** `app/lib/valuationParser.ts`

### 2. Staleness Flagging
**Before:** AI confidently used stale data without warning
**After:** Detects >20mo staleness + momentum gaps, reduces confidence
**Impact:** Valuations honest about data quality limitations
**Files:** `app/lib/valuation.ts`

### 3. Seed Script Recurrence Prevention
**Before:** Bulk inserts bypassed auto-research, created evidence gaps
**After:** Seed script auto-triggers research immediately
**Impact:** 14-company backlog cleared, future gaps prevented
**Files:** `scripts/seed-ticker-companies.mjs`

### 4. Synthetic Data Cleanup
**Before:** 4 fabricated test evidence items in production
**After:** All removed, audit confirms zero synthetic data
**Impact:** Database integrity restored
**Tools:** `scripts/delete-synthetic-evidence.mjs`, `scripts/audit-test-data.mjs`

---

## What Was Evaluated and Deprioritized

### 1. Form D Integration
**Cost:** Implementation effort + SEC API complexity
**Benefit:** Filing dates, corroboration only
**Gap:** No amounts without XML parsing, no post-money valuations
**Coverage:** Many private companies NOT in SEC database
**Decision:** DEPRIORITIZED - keep as on-demand utility, not pipeline step
**Files:** `app/lib/sec-edgar.ts` (POC code preserved)

### 2. Crunchbase Direct API
**Cost:** $5,000-10,000/year (Enterprise tier required)
**Benefit:** Structured API, direct access
**Gap:** Post-money valuations still "undisclosed" (same as now)
**Coverage:** No advantage (Perplexity already uses Crunchbase)
**Decision:** DEPRIORITIZED - low ROI, doesn't solve core problem
**Analysis:** `scripts/crunchbase-evaluation.md`

### 3. Perplexity Prompt Improvements
**Investigation:** Check if prompts were missing post-money instructions
**Finding:** Prompts already explicit, issue was PARSER not prompts
**Outcome:** Root cause was parser bug (now fixed), prompts were fine
**Decision:** COMPLETE via parser fix, no prompt changes needed

---

## Key Insights for Future Work

### 1. Post-Money Valuation Gap is Data Availability, Not Sourcing
- Crunchbase doesn't have it (frequently "undisclosed")
- Form D doesn't have it (not on the form)
- Perplexity can't extract what doesn't exist
- **Implication:** No public source will solve this
- **Path forward:** Accept limitation OR human contribution (pending legal)

### 2. Parser Bugs Can Masquerade as Sourcing Gaps
- "Missing evidence" was actually "unparsed evidence"
- 22 valuations existed but showed as NULL
- Tier 2 benchmark significantly affected
- **Implication:** Verify data quality before assuming sourcing problem
- **Tool:** `scripts/measure-parser-improvement.mjs`

### 3. Staleness Affects Different Company Types Differently
- **Parabolic non-AI** (SpaceX, Databricks, Chime): Underestimated
- **AI companies** (Anthropic, OpenAI): Overestimated  
- **Steady growth** (Anduril before fix): Worked well
- **Implication:** One-size staleness handling won't fit all
- **Current approach:** Flag it, let AI judge context

### 4. Benchmark Results Deserve Scrutiny, Not Celebration
- Anduril "0% perfect" was missing-data artifact
- Thin-evidence successes may be lucky, not validated
- Small n (5 companies) means variance is high
- **Implication:** Expand to n=15-20 before claiming validation
- **Caution:** Don't ship based on n=5 results

---

## Files to Know

### Production Code
- `app/lib/valuationParser.ts` - Parser (handles M and B now)
- `app/lib/valuation.ts` - Valuation generation (staleness flagging)
- `app/lib/perplexity.ts` - Research integration (prompts)
- `scripts/seed-ticker-companies.mjs` - Bulk import (auto-research added)

### Benchmark
- `scripts/accuracy-benchmark/RESULTS.md` - Corrected results + history
- `scripts/accuracy-benchmark/test-companies.json` - Test cases
- `scripts/accuracy-benchmark/run-valuation.mjs` - Run single company
- `scripts/accuracy-benchmark/score-benchmark.mjs` - Calculate metrics

### Audit Tools
- `scripts/audit-funding-completeness.mjs` - Database gap analysis
- `scripts/audit-test-data.mjs` - Verify no synthetic data
- `scripts/reparse-evidence-values.mjs` - Backfill NULL values
- `scripts/measure-parser-improvement.mjs` - Before/after comparison

### Deprioritized (POC Code)
- `app/lib/sec-edgar.ts` - Form D integration
- `scripts/crunchbase-evaluation.md` - Analysis document
- `scripts/poc-form-d.mjs` - Form D proof-of-concept test

---

## Next Session Checklist

Before resuming benchmark work:

- [ ] Build isolated test sandbox (prevents production contamination)
- [ ] Decide on legal review path (gating human contribution)
- [ ] Read this summary (don't re-read full session)
- [ ] Check RESULTS.md for current benchmark state
- [ ] Run `scripts/audit-test-data.mjs` to verify database integrity
- [ ] If expanding benchmark: track staleness as variable, include thin-coverage Series A

---

**Last updated:** August 2026  
**Session duration:** Multi-turn comprehensive investigation  
**Key outcome:** Parser fix recovered 22 valuations ($0 cost), higher ROI than any alternative source
